// app/api/clubs/[clubId]/route.ts
// Get club by ID or slug (IMPROVED with better error handling)

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

    console.log(`🔍 Looking for club: ${clubId}`);

    // Try multiple ways to find the club
    let club = null;

    // 1. Try by slug
    club = await db.collection("clubs").findOne({ slug: clubId });
    if (club) {
      console.log(`✅ Found by slug: ${club.name}`);
      return NextResponse.json(club);
    }

    // 2. Try by id
    club = await db.collection("clubs").findOne({ id: clubId });
    if (club) {
      console.log(`✅ Found by id: ${club.name}`);
      return NextResponse.json(club);
    }

    // 3. Try by name (case insensitive)
    club = await db.collection("clubs").findOne({
      name: { $regex: new RegExp(`^${clubId}$`, "i") },
    });
    if (club) {
      console.log(`✅ Found by name: ${club.name}`);
      return NextResponse.json(club);
    }

    // 4. Try by title (case insensitive)
    club = await db.collection("clubs").findOne({
      title: { $regex: new RegExp(`^${clubId}$`, "i") },
    });
    if (club) {
      console.log(`✅ Found by title: ${club.title}`);
      return NextResponse.json(club);
    }

    console.log(`❌ Club not found: ${clubId}`);
    console.log(`   Searched: slug, id, name, title`);

    // List all clubs for debugging
    const allClubs = await db
      .collection("clubs")
      .find(
        {},
        {
          projection: { name: 1, title: 1, slug: 1, id: 1 },
        }
      )
      .toArray();

    console.log(`   Available clubs:`);
    allClubs.forEach((c) => {
      console.log(
        `     - ${c.name || c.title} (slug: ${c.slug || "none"}, id: ${
          c.id || "none"
        })`
      );
    });

    return NextResponse.json(
      {
        error: "Club not found",
        searched: clubId,
        availableClubs: allClubs.map((c) => ({
          name: c.name || c.title,
          slug: c.slug,
          id: c.id,
          url: `/clubs/${c.slug || c.id}`,
        })),
      },
      { status: 404 }
    );
  } catch (error: any) {
    console.error("Error fetching club:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
