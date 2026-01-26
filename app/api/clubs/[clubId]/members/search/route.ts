// app/api/clubs/[clubId]/members/search/route.ts
// Search members in a club for family relationship linking

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET(
  request: NextRequest,
  { params }: { params: { clubId: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";

    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || "hockey-app");

    // Find club by slug
    const club = await db.collection("clubs").findOne({ slug: params.clubId });
    if (!club) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    // Build search query
    const searchQuery: any = {
      clubId: club.clubId,
    };

    if (query) {
      searchQuery.$or = [
        { "personalInfo.firstName": { $regex: query, $options: "i" } },
        { "personalInfo.lastName": { $regex: query, $options: "i" } },
        { memberId: { $regex: query, $options: "i" } },
      ];
    }

    // Get members
    const members = await db
      .collection("members")
      .find(searchQuery)
      .project({
        memberId: 1,
        personalInfo: 1,
        _id: 0,
      })
      .limit(20)
      .toArray();

    return NextResponse.json(members);
  } catch (error: any) {
    console.error("Error searching members:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
