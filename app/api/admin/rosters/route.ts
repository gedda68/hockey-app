import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";

// GET - Fetch rosters filtered by season
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get("year"); // Extract year from hook's fetch call

    console.log(`=== GET ROSTERS FOR SEASON: ${year || "ALL"} ===`);

    const db = await getDatabase();
    const rostersCollection = db.collection("rosters");

    // CRITICAL: Construct the query based on the 'year' parameter
    // If no year is passed, it defaults to returning nothing or you can handle as needed
    const query = year ? { season: year } : {};

    const rosters = await rostersCollection
      .find(query)
      .sort({ ageGroup: 1 })
      .toArray();

    console.log(`✅ Fetched ${rosters.length} rosters for season ${year}`);

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
      { error: "Failed to fetch rosters" },
      { status: 500 }
    );
  }
}

// POST - Create new roster with season validation
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { ageGroup, season } = body;

    console.log(`=== CREATE ROSTER: ${ageGroup} (${season}) ===`);

    const db = await getDatabase();
    const rostersCollection = db.collection("rosters");

    // 1. Validation: Ensure both required fields exist
    if (!ageGroup || !season) {
      return NextResponse.json(
        { error: "Age Group and Season are required" },
        { status: 400 }
      );
    }

    // 2. Duplicate Check: Search for the pair (AgeGroup + Season)
    const existing = await rostersCollection.findOne({
      ageGroup: ageGroup.trim(),
      season: season.toString(),
    });

    if (existing) {
      console.log(`❌ Conflict: ${ageGroup} already exists for ${season}`);
      return NextResponse.json(
        {
          error: `A roster for ${ageGroup} in the ${season} season already exists.`,
        },
        { status: 400 }
      );
    }

    // 3. Document Construction
    const newRoster = {
      ageGroup: ageGroup.trim(),
      season: season.toString(),
      lastUpdated: body.lastUpdated || new Date().toLocaleDateString("en-AU"),
      teams: body.teams || [],
      shadowPlayers: body.shadowPlayers || [],
      withdrawn: body.withdrawn || [],
      selectors: body.selectors || [],
      trialInfo: body.trialInfo || null,
      trainingInfo: body.trainingInfo || null,
      tournamentInfo: body.tournamentInfo || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await rostersCollection.insertOne(newRoster);
    console.log("✅ Roster created with ID:", result.insertedId);

    return NextResponse.json(
      {
        message: "Roster created successfully",
        _id: result.insertedId,
        ageGroup: ageGroup,
        season: season,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("❌ Error creating roster:", error);
    return NextResponse.json(
      { error: "Failed to create roster" },
      { status: 500 }
    );
  }
}
