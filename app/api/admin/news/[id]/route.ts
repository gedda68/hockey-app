// app/api/admin/news/[id]/route.ts
// Admin API for updating/deleting news items (tenant-scoped).

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { requireRole } from "@/lib/auth/middleware";
import { MEDIA_CONTENT_ADMIN_ROLES } from "@/lib/auth/mediaContentRoles";
import {
  parseNewsScope,
  userCanMutateNewsItem,
} from "@/lib/portal/newsScope";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";
import type { NewsAttachment } from "@/types/news";
import {
  legacyVideoUrlFromAttachments,
  normalizeAttachmentsFromDoc,
  primaryImageFromAttachments,
} from "@/lib/news/newsAttachments";
import { parseVideoEmbed } from "@/lib/website/videoEmbeds";
import { buildNewsAttachmentsFromFormData } from "@/lib/news/buildNewsAttachmentsFromForm";
import { sanitizeRichText } from "@/lib/utils/sanitizeServer";

function newsUploadDiskPath(publicPath: string): string {
  const rel = String(publicPath ?? "").replace(/^\/+/, "");
  return path.join(process.cwd(), "public", rel);
}

async function safeUnlinkPublicUpload(publicPath: string | null | undefined) {
  const p = publicPath ? String(publicPath).trim() : "";
  if (!p.startsWith("/uploads/news/")) return;
  try {
    await unlink(newsUploadDiskPath(p));
  } catch {
    /* ignore */
  }
}

function collectNewsUploadPaths(doc: Record<string, unknown>): Set<string> {
  const out = new Set<string>();
  const img = (doc.imageUrl ?? doc.image) as unknown;
  if (typeof img === "string" && img.startsWith("/uploads/news/")) out.add(img);
  const atts = normalizeAttachmentsFromDoc(doc);
  for (const a of atts) {
    if (typeof a.url === "string" && a.url.startsWith("/uploads/news/")) out.add(a.url);
  }
  return out;
}

// PUT - Update news item with image upload
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, response } = await requireRole(request, MEDIA_CONTENT_ADMIN_ROLES);
  if (response) return response;

  try {
    const { id } = await params;
    const formData = await request.formData();

    const title = formData.get("title") as string;
    const content = formData.get("content") as string;
    const publishDate = formData.get("publishDate") as string;
    const expiryDate = formData.get("expiryDate") as string;
    const author = formData.get("author") as string;
    const active = formData.get("active") === "true";
    const imageFile = formData.get("image") as File | null;
    const existingImage = formData.get("existingImage") as string | null;
    const videoUrl = (formData.get("videoUrl") as string | null) ?? "";
    const attachmentsJson = (formData.get("attachmentsJson") as string | null) ?? "";

    const client = await clientPromise;
    const database = client.db(process.env.DB_NAME || "hockey-app");
    const newsCollection = database.collection("news");

    const existingNews = await newsCollection.findOne({ id });
    if (!existingNews) {
      return NextResponse.json(
        { error: "News item not found" },
        { status: 404 },
      );
    }

    const scope = parseNewsScope(
      existingNews as unknown as Record<string, unknown>,
    );
    if (!userCanMutateNewsItem(user, scope)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const beforeDoc = existingNews as unknown as Record<string, unknown>;
    const beforeUploads = collectNewsUploadPaths(beforeDoc);

    let imageUrl = existingNews.image || existingNews.imageUrl;

    if (imageFile && imageFile.size > 0) {
      try {
        const uploadsDir = path.join(
          process.cwd(),
          "public",
          "uploads",
          "news",
        );
        await mkdir(uploadsDir, { recursive: true });

        const timestamp = Date.now();
        const originalName = imageFile.name;
        const extension = path.extname(originalName);
        const filename = `news-${timestamp}${extension}`;
        const filepath = path.join(uploadsDir, filename);

        const bytes = await imageFile.arrayBuffer();
        const buffer = Buffer.from(bytes);

        await writeFile(filepath, buffer);

        imageUrl = `/uploads/news/${filename}`;
      } catch (error) {
        console.error("Error uploading image:", error);
        return NextResponse.json(
          { error: "Failed to upload image" },
          { status: 500 },
        );
      }
    } else if (existingImage) {
      imageUrl = existingImage;
    }

    let attachments: NewsAttachment[] | undefined;
    if (attachmentsJson.trim()) {
      const built = await buildNewsAttachmentsFromFormData(formData);
      if (!built.ok) {
        return NextResponse.json({ error: built.error }, { status: built.status });
      }
      attachments = built.attachments.length ? built.attachments : undefined;
    }

    // Sanitise rich-text HTML before storing — prevents stored XSS (S7)
    const safeContent = sanitizeRichText(content);

    const trimmedVideo = videoUrl?.trim() ? videoUrl.trim() : "";
    if (trimmedVideo && !parseVideoEmbed(trimmedVideo)) {
      return NextResponse.json(
        { error: "Unsupported video URL (YouTube/Vimeo only)" },
        { status: 400 },
      );
    }

    const primaryFromGallery = attachments
      ? primaryImageFromAttachments(attachments)
      : null;
    const legacyVideo = attachments ? legacyVideoUrlFromAttachments(attachments) : null;

    const finalImageUrl = primaryFromGallery || imageUrl;
    const finalVideoUrl = legacyVideo || (trimmedVideo ? trimmedVideo : null);

    const updateData: Record<string, unknown> = {
      title,
      content: safeContent,
      image: finalImageUrl,
      imageUrl: finalImageUrl,
      videoUrl: finalVideoUrl,
      publishDate: new Date(publishDate),
      expiryDate: new Date(expiryDate),
      author: author || null,
      active,
      updatedAt: new Date(),
    };
    if (attachmentsJson.trim()) {
      updateData.attachments = attachments;
    }

    await newsCollection.updateOne({ id }, { $set: updateData });
    const updated = await newsCollection.findOne({ id });

    if (!updated) {
      return NextResponse.json(
        { error: "News item not found" },
        { status: 404 },
      );
    }

    const afterDoc = updated as unknown as Record<string, unknown>;
    const afterUploads = collectNewsUploadPaths(afterDoc);
    for (const p of beforeUploads) {
      if (!afterUploads.has(p)) await safeUnlinkPublicUpload(p);
    }

    return NextResponse.json({
      ...updated,
      _id: updated._id.toString(),
      attachments: normalizeAttachmentsFromDoc(afterDoc),
    });
  } catch (error) {
    console.error("Error updating news:", error);
    return NextResponse.json(
      { error: "Failed to update news" },
      { status: 500 },
    );
  }
}

// PATCH - Partial update (e.g., toggle active); ignores unknown keys
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, response } = await requireRole(request, MEDIA_CONTENT_ADMIN_ROLES);
  if (response) return response;

  try {
    const { id } = await params;
    const body = (await request.json()) as Record<string, unknown>;

    const client = await clientPromise;
    const database = client.db(process.env.DB_NAME || "hockey-app");
    const newsCollection = database.collection("news");

    const existingNews = await newsCollection.findOne({ id });
    if (!existingNews) {
      return NextResponse.json(
        { error: "News item not found" },
        { status: 404 },
      );
    }

    const scope = parseNewsScope(
      existingNews as unknown as Record<string, unknown>,
    );
    if (!userCanMutateNewsItem(user, scope)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const allowed: Record<string, unknown> = { updatedAt: new Date() };
    if (typeof body.active === "boolean") {
      allowed.active = body.active;
    }

    await newsCollection.updateOne({ id }, { $set: allowed });
    const updated = await newsCollection.findOne({ id });

    if (!updated) {
      return NextResponse.json(
        { error: "News item not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      ...updated,
      _id: updated._id.toString(),
    });
  } catch (error) {
    console.error("Error updating news:", error);
    return NextResponse.json(
      { error: "Failed to update news" },
      { status: 500 },
    );
  }
}

// DELETE
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, response } = await requireRole(request, MEDIA_CONTENT_ADMIN_ROLES);
  if (response) return response;

  try {
    const { id } = await params;

    const client = await clientPromise;
    const database = client.db(process.env.DB_NAME || "hockey-app");
    const newsCollection = database.collection("news");

    const newsItem = await newsCollection.findOne({ id });

    if (!newsItem) {
      return NextResponse.json(
        { error: "News item not found" },
        { status: 404 },
      );
    }

    const scope = parseNewsScope(newsItem as unknown as Record<string, unknown>);
    if (!userCanMutateNewsItem(user, scope)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const paths = collectNewsUploadPaths(newsItem as unknown as Record<string, unknown>);
    for (const p of paths) await safeUnlinkPublicUpload(p);

    const result = await newsCollection.deleteOne({ id });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "News item not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting news:", error);
    return NextResponse.json(
      { error: "Failed to delete news" },
      { status: 500 },
    );
  }
}
