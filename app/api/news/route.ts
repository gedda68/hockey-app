// app/api/news/route.ts
// API route to fetch active news items

import { NextResponse } from "next/server";
import { MongoClient } from "mongodb";

export async function GET() {
  const client = new MongoClient(process.env.MONGODB_URI!);

  try {
    await client.connect();
    const database = client.db(process.env.DB_NAME || "hockey-app");
    const newsCollection = database.collection("news");

    const now = new Date();

    // Fetch active news items that are published and not expired
    const newsItems = await newsCollection
      .find({
        active: true,
        publishDate: { $lte: now },
        expiryDate: { $gte: now },
      })
      .sort({ publishDate: -1 })
      .limit(10)
      .toArray();

    // Convert to plain objects
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
