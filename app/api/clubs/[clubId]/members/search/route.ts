// app/api/clubs/[clubId]/members/search/route.ts
// Member search API (using club.id)

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { escapeRegex } from "@/lib/utils/regex";

// GET - Search members in club
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clubId: string }> }
) {
  try {
    const { clubId } = await params; // This is the slug
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    if (!query || query.length < 2) {
      return NextResponse.json(
        { error: "Query must be at least 2 characters" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("hockey-app");

    // Find club by slug
    const club = await db.collection("clubs").findOne({ slug: clubId });
    if (!club) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    // ✅ Search members using club.id
    const safeQuery = escapeRegex(query);
    const members = await db
      .collection("members")
      .find({
        clubId: club.id,
        $or: [
          { "personalInfo.firstName": { $regex: safeQuery, $options: "i" } },
          { "personalInfo.lastName": { $regex: safeQuery, $options: "i" } },
          { "personalInfo.displayName": { $regex: safeQuery, $options: "i" } },
          { memberId: { $regex: safeQuery, $options: "i" } },
        ],
      })
      .limit(10)
      .toArray();

    return NextResponse.json(members);
  } catch (error) {
    console.error("Error searching members:", error);
    return NextResponse.json(
      { error: "Failed to search members" },
      { status: 500 }
    );
  }
}
