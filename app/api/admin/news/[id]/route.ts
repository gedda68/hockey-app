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

    let imageUrl = existingNews.image || existingNews.imageUrl;

    if (imageFile && imageFile.size > 0) {
      try {
        if (imageUrl && String(imageUrl).startsWith("/uploads/")) {
          const oldImagePath = path.join(process.cwd(), "public", String(imageUrl));
          try {
            await unlink(oldImagePath);
          } catch {
            /* ignore */
          }
        }

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

    const updateData: Record<string, unknown> = {
      title,
      content,
      image: imageUrl,
      imageUrl: imageUrl,
      publishDate: new Date(publishDate),
      expiryDate: new Date(expiryDate),
      author: author || null,
      active,
      updatedAt: new Date(),
    };

    await newsCollection.updateOne({ id }, { $set: updateData });
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

    const imageUrl = newsItem.image || newsItem.imageUrl;
    if (imageUrl && String(imageUrl).startsWith("/uploads/")) {
      const imagePath = path.join(process.cwd(), "public", String(imageUrl));
      try {
        await unlink(imagePath);
      } catch {
        console.log("Image file not found or already deleted");
      }
    }

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
