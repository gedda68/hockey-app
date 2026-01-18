import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";

// GET - Fetch all rosters
export async function GET(request: Request) {
  try {
    console.log("=== GET ALL ROSTERS ===");
    console.log("Timestamp:", new Date().toISOString());

    const db = await getDatabase();
    console.log("✅ Connected to database:", db.databaseName);

    const rostersCollection = db.collection("rosters");

    // Count documents
    const count = await rostersCollection.countDocuments();
    console.log("Total documents in collection:", count);

    // Fetch all rosters
    const rosters = await rostersCollection
      .find({})
      .sort({ ageGroup: 1 })
      .toArray();

    console.log(
      "Fetched rosters:",
      rosters.map((r) => ({
        ageGroup: r.ageGroup,
        teams: r.teams?.length || 0,
      }))
    );

    return NextResponse.json(rosters, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (error) {
    console.error("❌ Error fetching rosters:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch rosters",
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }
}

// POST - Create new roster
export async function POST(request: Request) {
  try {
    console.log("=== CREATE ROSTER ===");
    const body = await request.json();
    console.log("Request body:", body);

    const db = await getDatabase();
    const rostersCollection = db.collection("rosters");

    // Check if roster already exists
    const existing = await rostersCollection.findOne({
      ageGroup: body.ageGroup,
    });

    if (existing) {
      console.log("❌ Roster already exists:", body.ageGroup);
      return NextResponse.json(
        { error: "Roster already exists for this age group" },
        { status: 400 }
      );
    }

    // Create new roster
    const newRoster = {
      ageGroup: body.ageGroup,
      lastUpdated: body.lastUpdated || new Date().toLocaleDateString("en-AU"),
      teams: body.teams || [],
      shadowPlayers: body.shadowPlayers || [],
      withdrawn: body.withdrawn || [],
      trialInfo: body.trialInfo || null,
      trainingInfo: body.trainingInfo || null,
      tournamentInfo: body.tournamentInfo || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    console.log("Creating roster:", newRoster.ageGroup);

    const result = await rostersCollection.insertOne(newRoster);

    console.log("✅ Roster created:", result.insertedId);

    return NextResponse.json(
      {
        message: "Roster created successfully",
        _id: result.insertedId,
        ageGroup: body.ageGroup,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("❌ Error creating roster:", error);
    return NextResponse.json(
      {
        error: "Failed to create roster",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
