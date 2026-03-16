// app/api/admin/teams/rosters/route.ts
// POST - Create roster with ENHANCED DEBUGGING

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const season = searchParams.get("season");
    const clubId = searchParams.get("clubId");

    const client = await clientPromise;
    const db = client.db();

    const query: any = {};
    if (season) query.season = season;
    if (clubId && clubId !== "all") query.clubId = clubId;

    console.log("🔍 Fetching rosters with query:", query);

    const rosters = await db
      .collection("teamRosters")
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    console.log(`✅ Found ${rosters.length} rosters`);

    const userAccess = {
      clubId: null,
      clubName: null,
      isSuperAdmin: true,
    };

    return NextResponse.json({
      rosters,
      userAccess,
    });
  } catch (error: any) {
    console.error("❌ Error fetching rosters:", error);
    return NextResponse.json(
      { error: "Failed to fetch rosters" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clubId, category, division, gender, season } = body;

    console.log("📥 Received roster data:", body);

    if (!clubId || !category || !division || !gender || !season) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const client = await clientPromise;
    const db = client.db();

    // DEBUG: Check what clubs exist in database
    console.log("🔍 Looking for club with id:", clubId);

    // Try exact match on 'id' field
    let club = await db.collection("clubs").findOne({ id: clubId });
    console.log(
      "Result from { id: clubId }:",
      club ? "✅ FOUND" : "❌ NOT FOUND",
    );

    if (!club) {
      // Try _id field
      console.log("Trying _id field...");
      club = await db.collection("clubs").findOne({ _id: clubId });
      console.log(
        "Result from { _id: clubId }:",
        club ? "✅ FOUND" : "❌ NOT FOUND",
      );
    }

    if (!club) {
      // Try with $or for multiple fields
      console.log("Trying multiple fields with $or...");
      club = await db.collection("clubs").findOne({
        $or: [{ id: clubId }, { _id: clubId }, { clubId: clubId }],
      });
      console.log("Result from $or query:", club ? "✅ FOUND" : "❌ NOT FOUND");
    }

    if (!club) {
      // DEBUG: Show what clubs ARE in the database
      console.log("❌ Club not found. Let me check what's in the database...");
      const allClubs = await db.collection("clubs").find({}).limit(5).toArray();

      console.log("📋 First 5 clubs in database:");
      allClubs.forEach((c: any) => {
        console.log("  -", {
          id: c.id,
          _id: c._id?.toString(),
          clubId: c.clubId,
          name: c.name,
        });
      });

      console.log("\n🔍 Looking for match with:", clubId);
      console.log("Type of clubId:", typeof clubId);

      return NextResponse.json(
        {
          error: "Club not found",
          clubId,
          debug: {
            searchedFor: clubId,
            firstFiveClubs: allClubs.map((c: any) => ({
              id: c.id,
              name: c.name,
            })),
          },
        },
        { status: 404 },
      );
    }

    console.log("✅ Found club:", {
      id: club.id,
      name: club.name,
      colors: club.colors,
    });

    // Create roster
    const newRoster = {
      id: `roster-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      clubId: club.id || club.clubId || club._id?.toString(),
      clubName: club.name,
      clubShortName: club.shortName,
      clubColors: club.colors || {
        primary: "#06054e",
        secondary: "#3b82f6",
      },
      clubLogo: club.logo || null,
      category,
      division,
      gender,
      season,
      teams: [],
      shadowPlayers: [],
      withdrawn: [],
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
    };

    console.log("💾 Saving roster:", {
      id: newRoster.id,
      clubId: newRoster.clubId,
      clubName: newRoster.clubName,
      division: newRoster.division,
    });

    const result = await db.collection("teamRosters").insertOne(newRoster);

    console.log("✅ Roster created successfully:", result.insertedId);

    return NextResponse.json({
      success: true,
      roster: newRoster,
    });
  } catch (error: any) {
    console.error("❌ Error creating roster:", error);
    return NextResponse.json(
      { error: "Failed to create roster", details: error.message },
      { status: 500 },
    );
  }
}
