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

    const query: Record<string, unknown> = {};
    if (season) query.season = season;
    if (clubId && clubId !== "all") query.clubId = clubId;


    const rosters = await db
      .collection("teamRosters")
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();


    const userAccess = {
      clubId: null,
      clubName: null,
      isSuperAdmin: true,
    };

    return NextResponse.json({
      rosters,
      userAccess,
    });
  } catch (error: unknown) {
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


    if (!clubId || !category || !division || !gender || !season) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const client = await clientPromise;
    const db = client.db();

    // DEBUG: Check what clubs exist in database

    // Try exact match on 'id' field
    let club = await db.collection("clubs").findOne({ id: clubId });
      "Result from { id: clubId }:",
      club ? "✅ FOUND" : "❌ NOT FOUND",
    );

    if (!club) {
      // Try _id field
      club = await db.collection("clubs").findOne({ _id: clubId });
        "Result from { _id: clubId }:",
        club ? "✅ FOUND" : "❌ NOT FOUND",
      );
    }

    if (!club) {
      // Try with $or for multiple fields
      club = await db.collection("clubs").findOne({
        $or: [{ id: clubId }, { _id: clubId }, { clubId: clubId }],
      });
    }

    if (!club) {
      // DEBUG: Show what clubs ARE in the database
      const allClubs = await db.collection("clubs").find({}).limit(5).toArray();

      allClubs.forEach(() => {
          id: c.id,
          _id: c._id?.toString(),
          clubId: c.clubId,
          name: c.name,
        });
      });


      return NextResponse.json(
        {
          error: "Club not found",
          clubId,
          debug: {
            searchedFor: clubId,
            firstFiveClubs: allClubs.map(() => ({
              id: c.id,
              name: c.name,
            })),
          },
        },
        { status: 404 },
      );
    }

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

      id: newRoster.id,
      clubId: newRoster.clubId,
      clubName: newRoster.clubName,
      division: newRoster.division,
    });

    const result = await db.collection("teamRosters").insertOne(newRoster);


    return NextResponse.json({
      success: true,
      roster: newRoster,
    });
  } catch (error: unknown) {
    console.error("❌ Error creating roster:", error);
    return NextResponse.json(
      { error: "Failed to create roster", details: error.message },
      { status: 500 },
    );
  }
}
