// app/api/clubs/[clubId]/route.ts
// Get a club document by slug or id.
//
// Field naming note:
//   - URL param: :clubId  (can be a slug OR the club's `id` string)
//   - DB field `slug`     — canonical URL identifier (e.g. "commercial-hc")
//   - DB field `id`       — short identifier used internally (e.g. "CHC")
//   - DB field `name`     — human-readable name (never used as URL key)
//
// The `title` field is legacy JSON data that predates the MongoDB migration.
// New documents should use `name` exclusively.

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clubId: string }> }
) {
  try {
    const { clubId } = await params;
    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || "hockey-app");

    // Priority order: slug (canonical) → id (internal key) → legacy title
    const club =
      (await db.collection("clubs").findOne({ slug: clubId })) ??
      (await db.collection("clubs").findOne({ id: clubId })) ??
      // Legacy: pre-migration documents used `title` instead of `name`
      (await db.collection("clubs").findOne({
        title: { $regex: new RegExp(`^${clubId}$`, "i") },
      }));

    if (!club) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    return NextResponse.json(club);
  } catch (error: unknown) {
    console.error("Error fetching club:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
