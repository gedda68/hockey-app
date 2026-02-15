// app/api/admin/news/[id]/route.ts
// Admin API for updating/deleting news items with image upload

import { NextRequest, NextResponse } from "next/server";
import { MongoClient } from "mongodb";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";

// PUT - Update news item with image upload
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const client = new MongoClient(process.env.MONGODB_URI!);

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

    await client.connect();
    const database = client.db(process.env.DB_NAME || "hockey-app");
    const newsCollection = database.collection("news");

    // Get existing news item
    const existingNews = await newsCollection.findOne({ id });
    if (!existingNews) {
      return NextResponse.json(
        { error: "News item not found" },
        { status: 404 },
      );
    }

    let imageUrl = existingNews.image || existingNews.imageUrl;

    // Handle new image upload
    if (imageFile && imageFile.size > 0) {
      try {
        // Delete old image if exists
        if (imageUrl && imageUrl.startsWith("/uploads/")) {
          const oldImagePath = path.join(process.cwd(), "public", imageUrl);
          try {
            await unlink(oldImagePath);
          } catch (err) {
            // Ignore if file doesn't exist
          }
        }

        // Create uploads directory if it doesn't exist
        const uploadsDir = path.join(
          process.cwd(),
          "public",
          "uploads",
          "news",
        );
        await mkdir(uploadsDir, { recursive: true });

        // Generate unique filename
        const timestamp = Date.now();
        const originalName = imageFile.name;
        const extension = path.extname(originalName);
        const filename = `news-${timestamp}${extension}`;
        const filepath = path.join(uploadsDir, filename);

        // Convert File to Buffer
        const bytes = await imageFile.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Write file
        await writeFile(filepath, buffer);

        // Set new image URL
        imageUrl = `/uploads/news/${filename}`;
      } catch (error) {
        console.error("Error uploading image:", error);
        return NextResponse.json(
          { error: "Failed to upload image" },
          { status: 500 },
        );
      }
    } else if (existingImage) {
      // Keep existing image
      imageUrl = existingImage;
    }

    const updateData: any = {
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

    const result = await newsCollection.findOneAndUpdate(
      { id },
      { $set: updateData },
      { returnDocument: "after" },
    );

    if (!result) {
      return NextResponse.json(
        { error: "News item not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      ...result,
      _id: result._id.toString(),
    });
  } catch (error) {
    console.error("Error updating news:", error);
    return NextResponse.json(
      { error: "Failed to update news" },
      { status: 500 },
    );
  } finally {
    await client.close();
  }
}

// PATCH - Partial update (e.g., toggle active)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const client = new MongoClient(process.env.MONGODB_URI!);

  try {
    const { id } = await params;
    const body = await request.json();

    await client.connect();
    const database = client.db(process.env.DB_NAME || "hockey-app");
    const newsCollection = database.collection("news");

    const result = await newsCollection.findOneAndUpdate(
      { id },
      {
        $set: {
          ...body,
          updatedAt: new Date(),
        },
      },
      { returnDocument: "after" },
    );

    if (!result) {
      return NextResponse.json(
        { error: "News item not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      ...result,
      _id: result._id.toString(),
    });
  } catch (error) {
    console.error("Error updating news:", error);
    return NextResponse.json(
      { error: "Failed to update news" },
      { status: 500 },
    );
  } finally {
    await client.close();
  }
}

// DELETE - Delete news item and associated image
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const client = new MongoClient(process.env.MONGODB_URI!);

  try {
    const { id } = await params;

    await client.connect();
    const database = client.db(process.env.DB_NAME || "hockey-app");
    const newsCollection = database.collection("news");

    // Get news item to find image
    const newsItem = await newsCollection.findOne({ id });

    if (!newsItem) {
      return NextResponse.json(
        { error: "News item not found" },
        { status: 404 },
      );
    }

    // Delete image file if exists
    const imageUrl = newsItem.image || newsItem.imageUrl;
    if (imageUrl && imageUrl.startsWith("/uploads/")) {
      const imagePath = path.join(process.cwd(), "public", imageUrl);
      try {
        await unlink(imagePath);
      } catch (err) {
        // Ignore if file doesn't exist
        console.log("Image file not found or already deleted");
      }
    }

    // Delete news item from database
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
  } finally {
    await client.close();
  }
}
