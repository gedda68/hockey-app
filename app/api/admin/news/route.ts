// app/api/admin/news/route.ts
// Admin API for managing news items with image upload (tenant-scoped).

import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { requireRole, requireResourceAccess } from "@/lib/auth/middleware";
import { MEDIA_CONTENT_ADMIN_ROLES } from "@/lib/auth/mediaContentRoles";
import {
  adminNewsListFilter,
  resolveNewsScopeForCreate,
} from "@/lib/portal/newsScope";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import type { NewsAttachment } from "@/types/news";
import {
  legacyVideoUrlFromAttachments,
  normalizeAttachmentsFromDoc,
  primaryImageFromAttachments,
} from "@/lib/news/newsAttachments";
import { parseVideoEmbed } from "@/lib/website/videoEmbeds";
import { buildNewsAttachmentsFromFormData } from "@/lib/news/buildNewsAttachmentsFromForm";

// GET — list news visible to this admin (portal-scoped)
export async function GET(request: NextRequest) {
  const { user, response } = await requireRole(request, MEDIA_CONTENT_ADMIN_ROLES);
  if (response) return response;

  try {
    const client = await clientPromise;
    const database = client.db(process.env.DB_NAME || "hockey-app");
    const newsCollection = database.collection("news");

    const q = adminNewsListFilter(user);
    const newsItems = await newsCollection
      .find(q)
      .sort({ publishDate: -1 })
      .toArray();

    const plainNewsItems = newsItems.map((item) => ({
      _id: item._id.toString(),
      id: item.id || item._id.toString(),
      title: item.title,
      content: item.content,
      image: item.image,
      imageUrl: item.imageUrl,
      videoUrl: item.videoUrl ?? null,
      attachments: normalizeAttachmentsFromDoc(item as unknown as Record<string, unknown>),
      publishDate: item.publishDate,
      expiryDate: item.expiryDate,
      author: item.author,
      active: item.active,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      scopeType: item.scopeType ?? "platform",
      scopeId: item.scopeId ?? null,
    }));

    return NextResponse.json({
      items: plainNewsItems,
      editorContext: {
        role: user.role,
        associationId: user.associationId,
        clubId: user.clubId,
        defaultScopeType:
          user.role === "super-admin"
            ? "platform"
            : user.clubId
              ? "club"
              : user.associationId
                ? "association"
                : "platform",
        defaultScopeId: user.clubId ?? user.associationId ?? null,
      },
    });
  } catch (error) {
    console.error("Error fetching news:", error);
    return NextResponse.json(
      { error: "Failed to fetch news" },
      { status: 500 },
    );
  }
}

// POST — create news in allowed scope
export async function POST(request: NextRequest) {
  const { user, response } = await requireRole(request, MEDIA_CONTENT_ADMIN_ROLES);
  if (response) return response;

  try {
    const formData = await request.formData();

    const title = formData.get("title") as string;
    const content = formData.get("content") as string;
    const publishDate = formData.get("publishDate") as string;
    const expiryDate = formData.get("expiryDate") as string;
    const author = formData.get("author") as string;
    const active = formData.get("active") === "true";
    const imageFile = formData.get("image") as File | null;
    const videoUrl = (formData.get("videoUrl") as string | null) ?? "";
    const scopeTypeField = formData.get("scopeType") as string | null;
    const scopeIdField = formData.get("scopeId") as string | null;

    if (!title || !content || !publishDate || !expiryDate) {
      return NextResponse.json(
        { error: "Title, content, publish date, and expiry date are required" },
        { status: 400 },
      );
    }

    const resolved = resolveNewsScopeForCreate(user, {
      scopeType: scopeTypeField ?? undefined,
      scopeId: scopeIdField,
    });
    if (!resolved.ok) {
      return NextResponse.json({ error: resolved.error }, { status: 400 });
    }
    const { scope } = resolved;

    if (
      user.role !== "super-admin" &&
      scope.scopeType === "association" &&
      scope.scopeId
    ) {
      const ra = await requireResourceAccess(
        request,
        "association",
        scope.scopeId,
      );
      if (ra.response) return ra.response;
    }
    if (user.role !== "super-admin" && scope.scopeType === "club" && scope.scopeId) {
      const rc = await requireResourceAccess(request, "club", scope.scopeId);
      if (rc.response) return rc.response;
    }

    let imageUrl = null;

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
    }

    const built = await buildNewsAttachmentsFromFormData(formData);
    if (!built.ok) {
      return NextResponse.json({ error: built.error }, { status: built.status });
    }
    const attachments: NewsAttachment[] = built.attachments;

    const primaryFromGallery = primaryImageFromAttachments(attachments);
    const legacyVideo = legacyVideoUrlFromAttachments(attachments);
    const trimmedVideo = videoUrl?.trim() ? videoUrl.trim() : "";
    if (trimmedVideo && !parseVideoEmbed(trimmedVideo)) {
      return NextResponse.json(
        { error: "Unsupported video URL (YouTube/Vimeo only)" },
        { status: 400 },
      );
    }
    const finalImageUrl = primaryFromGallery || imageUrl;
    const finalVideoUrl = legacyVideo || (trimmedVideo ? trimmedVideo : null);

    const client = await clientPromise;
    const database = client.db(process.env.DB_NAME || "hockey-app");
    const newsCollection = database.collection("news");

    const newsItem = {
      id: new ObjectId().toString(),
      title,
      content,
      image: finalImageUrl,
      imageUrl: finalImageUrl,
      videoUrl: finalVideoUrl,
      attachments: attachments.length ? attachments : undefined,
      publishDate: new Date(publishDate),
      expiryDate: new Date(expiryDate),
      author: author || null,
      active,
      scopeType: scope.scopeType,
      scopeId: scope.scopeId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await newsCollection.insertOne(newsItem);

    return NextResponse.json({
      ...newsItem,
      _id: result.insertedId.toString(),
    });
  } catch (error) {
    console.error("Error creating news:", error);
    return NextResponse.json(
      { error: "Failed to create news" },
      { status: 500 },
    );
  }
}
