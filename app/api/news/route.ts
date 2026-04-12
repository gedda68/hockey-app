// app/api/news/route.ts
// Active news items for the current portal (Host / ?portal=).

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getPublicTenantFromRequest } from "@/lib/tenant/requestTenant";
import { publicNewsMongoFilter } from "@/lib/portal/newsScope";

export async function GET(request: NextRequest) {
  try {
    const tenant = await getPublicTenantFromRequest(request);
    const client = await clientPromise;
    const database = client.db(process.env.DB_NAME || "hockey-app");
    const now = new Date();
    const scope = publicNewsMongoFilter(tenant);

    const newsItems = await database
      .collection("news")
      .find({
        ...scope,
        active: true,
        publishDate: { $lte: now },
        expiryDate: { $gte: now },
      })
      .sort({ publishDate: -1 })
      .limit(10)
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
  }
}
