// app/api/admin/news/route.ts
// Admin API for managing news items with image upload

import { NextRequest, NextResponse } from "next/server";
import { MongoClient, ObjectId } from "mongodb";
import { requireRole } from "@/lib/auth/middleware";
import { MEDIA_CONTENT_ADMIN_ROLES } from "@/lib/auth/mediaContentRoles";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

// GET - Fetch all news (including inactive/expired)
export async function GET(request: NextRequest) {
  const { response } = await requireRole(request, MEDIA_CONTENT_ADMIN_ROLES);
  if (response) return response;

  const client = new MongoClient(process.env.MONGODB_URI!);

  try {
    await client.connect();
    const database = client.db(process.env.DB_NAME || "hockey-app");
    const newsCollection = database.collection("news");

    const newsItems = await newsCollection
      .find({})
      .sort({ publishDate: -1 })
      .toArray();

    const plainNewsItems = newsItems.map((item) => ({
      _id: item._id.toString(),
      id: item.id || item._id.toString(),
      title: item.title,
      content: item.content,
      image: item.image,
      imageUrl: item.imageUrl,
      publishDate: item.publishDate,
      expiryDate: item.expiryDate,
      author: item.author,
      active: item.active,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }));

    return NextResponse.json(plainNewsItems);
  } catch (error) {
    console.error("Error fetching news:", error);
    return NextResponse.json(
      { error: "Failed to fetch news" },
      { status: 500 },
    );
  } finally {
    await client.close();
  }
}

// POST - Create new news item with image upload
export async function POST(request: NextRequest) {
  const { response } = await requireRole(request, MEDIA_CONTENT_ADMIN_ROLES);
  if (response) return response;

  const client = new MongoClient(process.env.MONGODB_URI!);

  try {
    const formData = await request.formData();

    const title = formData.get("title") as string;
    const content = formData.get("content") as string;
    const publishDate = formData.get("publishDate") as string;
    const expiryDate = formData.get("expiryDate") as string;
    const author = formData.get("author") as string;
    const active = formData.get("active") === "true";
    const imageFile = formData.get("image") as File | null;

    if (!title || !content || !publishDate || !expiryDate) {
      return NextResponse.json(
        { error: "Title, content, publish date, and expiry date are required" },
        { status: 400 },
      );
    }

    let imageUrl = null;

    // Handle image upload
    if (imageFile && imageFile.size > 0) {
      try {
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

        // Set image URL (public path)
        imageUrl = `/uploads/news/${filename}`;
      } catch (error) {
        console.error("Error uploading image:", error);
        return NextResponse.json(
          { error: "Failed to upload image" },
          { status: 500 },
        );
      }
    }

    await client.connect();
    const database = client.db(process.env.DB_NAME || "hockey-app");
    const newsCollection = database.collection("news");

    const newsItem = {
      id: new ObjectId().toString(),
      title,
      content,
      image: imageUrl,
      imageUrl: imageUrl,
      publishDate: new Date(publishDate),
      expiryDate: new Date(expiryDate),
      author: author || null,
      active,
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
  } finally {
    await client.close();
  }
}
