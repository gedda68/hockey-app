import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";

// POST - Bulk upload/update rosters
export async function POST(request: Request) {
  try {
    const rosters = await request.json();

    // Validate input
    if (!Array.isArray(rosters)) {
      return NextResponse.json(
        { error: "Invalid data format. Expected array of rosters." },
        { status: 400 }
      );
    }

    if (rosters.length === 0) {
      return NextResponse.json(
        { error: "No rosters provided" },
        { status: 400 }
      );
    }

    // Validate each roster has required fields
    const invalidRosters = rosters.filter((r) => !r.ageGroup);
    if (invalidRosters.length > 0) {
      return NextResponse.json(
        {
          error: "Some rosters are missing required field: ageGroup",
          count: invalidRosters.length,
        },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const rostersCollection = db.collection("rosters");

    // Add timestamps to each roster
    const timestamp = new Date();
    const rostersWithTimestamps = rosters.map((roster) => ({
      ageGroup: roster.ageGroup,
      lastUpdated: roster.lastUpdated || timestamp.toLocaleDateString("en-AU"),
      teams: roster.teams || [],
      shadowPlayers: roster.shadowPlayers || [],
      withdrawn: roster.withdrawn || [],
      trialInfo: roster.trialInfo || null,
      trainingInfo: roster.trainingInfo || null,
      tournamentInfo: roster.tournamentInfo || null,
      createdAt: roster.createdAt || timestamp,
      updatedAt: timestamp,
    }));

    // Use bulkWrite for better performance
    const bulkOps = rostersWithTimestamps.map((roster) => ({
      updateOne: {
        filter: { ageGroup: roster.ageGroup },
        update: {
          $set: roster,
          $setOnInsert: { createdAt: roster.createdAt },
        },
        upsert: true,
      },
    }));

    const result = await rostersCollection.bulkWrite(bulkOps);

    return NextResponse.json(
      {
        message: "Bulk upload successful",
        inserted: result.upsertedCount,
        updated: result.modifiedCount,
        matched: result.matchedCount,
        total: rosters.length,
        ageGroups: rosters.map((r) => r.ageGroup),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error bulk uploading rosters:", error);
    return NextResponse.json(
      {
        error: "Failed to bulk upload rosters",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// DELETE - Bulk delete rosters
export async function DELETE(request: Request) {
  try {
    const { ageGroups } = await request.json();

    if (!Array.isArray(ageGroups) || ageGroups.length === 0) {
      return NextResponse.json(
        { error: "Invalid data. Expected array of age groups." },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const rostersCollection = db.collection("rosters");

    const result = await rostersCollection.deleteMany({
      ageGroup: { $in: ageGroups },
    });

    return NextResponse.json({
      message: "Bulk delete successful",
      deletedCount: result.deletedCount,
      ageGroups: ageGroups,
    });
  } catch (error) {
    console.error("Error bulk deleting rosters:", error);
    return NextResponse.json(
      {
        error: "Failed to bulk delete rosters",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// PUT - Bulk update specific fields across multiple rosters
export async function PUT(request: Request) {
  try {
    const { ageGroups, updates } = await request.json();

    if (!Array.isArray(ageGroups) || !updates) {
      return NextResponse.json(
        { error: "Invalid data. Expected ageGroups array and updates object." },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const rostersCollection = db.collection("rosters");

    const result = await rostersCollection.updateMany(
      { ageGroup: { $in: ageGroups } },
      {
        $set: {
          ...updates,
          updatedAt: new Date(),
        },
      }
    );

    return NextResponse.json({
      message: "Bulk update successful",
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
      ageGroups: ageGroups,
    });
  } catch (error) {
    console.error("Error bulk updating rosters:", error);
    return NextResponse.json(
      {
        error: "Failed to bulk update rosters",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
