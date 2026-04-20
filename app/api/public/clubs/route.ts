// app/api/public/clubs/route.ts
// Public club directory — returns only safe, non-sensitive fields.
// No authentication required.
//
// Fields returned: name, slug, shortName, logoUrl, city, state, status (active only).
// Email, contacts, admin metadata, and internal IDs are never exposed here.
//
// Admin club management (all fields) → GET /api/clubs  (requires club.view permission)

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

const CACHE_SECONDS = 60; // CDN-friendly; clubs change infrequently

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("q")?.trim().toLowerCase() ?? "";
    const associationId = searchParams.get("associationId")?.trim() ?? "";

    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || "hockey-app");

    const query: Record<string, unknown> = { status: { $ne: "inactive" } };
    if (associationId) query.parentAssociationId = associationId;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { shortName: { $regex: search, $options: "i" } },
        { city: { $regex: search, $options: "i" } },
      ];
    }

    const clubs = await db
      .collection("clubs")
      .find(query, {
        projection: {
          _id: 0,
          // Safe public fields only — no email, contacts, or admin metadata
          id: 1,
          slug: 1,
          name: 1,
          shortName: 1,
          logoUrl: 1,
          city: 1,
          state: 1,
          parentAssociationId: 1,
          "branding.primaryColor": 1,
          "branding.secondaryColor": 1,
        },
      })
      .sort({ name: 1 })
      .toArray();

    return NextResponse.json(
      { clubs },
      {
        headers: {
          "Cache-Control": `public, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=300`,
        },
      },
    );
  } catch (error) {
    console.error("❌ Error fetching public clubs:", error);
    return NextResponse.json({ error: "Failed to fetch clubs" }, { status: 500 });
  }
}
