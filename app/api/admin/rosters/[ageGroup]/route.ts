// app/api/admin/rosters/[ageGroup]/route.ts
// Next.js 15 Compatible - params must be awaited

import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ ageGroup: string }> }
) {
  try {
    const { ageGroup: encodedAgeGroup } = await params;
    const ageGroup = decodeURIComponent(encodedAgeGroup);
    console.log("[GET] Fetching roster for:", ageGroup);

    const client = await clientPromise;
    const db = client.db("hockey-app");
    const rostersCollection = db.collection("rosters");

    const roster = await rostersCollection.findOne({ ageGroup });

    if (!roster) {
      console.log("[GET] Roster not found:", ageGroup);
      return NextResponse.json({ error: "Roster not found" }, { status: 404 });
    }

    console.log("[GET] Found roster with", roster.teams?.length || 0, "teams");

    // Remove MongoDB _id before sending
    const { _id, ...rosterData } = roster;

    return NextResponse.json(rosterData);
  } catch (error) {
    console.error("[GET] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch roster" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ ageGroup: string }> }
) {
  try {
    const { ageGroup: encodedAgeGroup } = await params;
    const ageGroup = decodeURIComponent(encodedAgeGroup);
    const body = await request.json();

    console.log("=== PUT /api/admin/rosters/[ageGroup] ===");
    console.log("1. Age Group:", ageGroup);
    console.log("2. Teams to save:", body.teams?.length || 0);

    if (body.teams) {
      console.log(
        "3. Team names:",
        body.teams.map((t: any) => t.name).join(", ")
      );
    }

    const client = await clientPromise;
    const db = client.db("hockey-app");
    const rostersCollection = db.collection("rosters");

    // Check if roster exists
    const existingRoster = await rostersCollection.findOne({ ageGroup });

    if (!existingRoster) {
      console.log("4. ❌ Roster not found in MongoDB:", ageGroup);
      return NextResponse.json(
        { error: `Roster "${ageGroup}" not found` },
        { status: 404 }
      );
    }

    console.log("4. ✅ Found existing roster");
    console.log("5. Current teams in DB:", existingRoster.teams?.length || 0);

    // Build complete update object
    const updateData = {
      ageGroup: body.ageGroup,
      lastUpdated: body.lastUpdated || new Date().toLocaleDateString("en-AU"),
      teams: body.teams || [],
      shadowPlayers: body.shadowPlayers || [],
      withdrawn: body.withdrawn || [],
      trialInfo:
        body.trialInfo !== undefined
          ? body.trialInfo
          : existingRoster.trialInfo,
      trainingInfo:
        body.trainingInfo !== undefined
          ? body.trainingInfo
          : existingRoster.trainingInfo,
      tournamentInfo:
        body.tournamentInfo !== undefined
          ? body.tournamentInfo
          : existingRoster.tournamentInfo,
    };

    console.log("6. Updating with", updateData.teams.length, "teams");

    // Update roster in MongoDB
    const updateResult = await rostersCollection.updateOne(
      { ageGroup },
      { $set: updateData }
    );

    console.log("7. Update result:", {
      matched: updateResult.matchedCount,
      modified: updateResult.modifiedCount,
      acknowledged: updateResult.acknowledged,
    });

    if (updateResult.matchedCount === 0) {
      console.log("8. ❌ No documents matched");
      return NextResponse.json(
        { error: "Roster not found for update" },
        { status: 404 }
      );
    }

    // Verify the update worked
    const verifyRoster = await rostersCollection.findOne({ ageGroup });
    console.log(
      "8. ✅ Verification - Teams now in DB:",
      verifyRoster?.teams?.length || 0
    );

    if (verifyRoster?.teams?.length !== body.teams?.length) {
      console.log("9. ⚠️ WARNING: Team count mismatch!");
      console.log("   Expected:", body.teams?.length);
      console.log("   Got:", verifyRoster?.teams?.length);
    } else {
      console.log("9. ✅ Team count matches!");
    }

    return NextResponse.json({
      message: "Roster updated successfully",
      ageGroup: ageGroup,
      teamsCount: verifyRoster?.teams?.length || 0,
      teamNames: verifyRoster?.teams?.map((t: any) => t.name) || [],
    });
  } catch (error) {
    console.error("❌ PUT Error:", error);
    return NextResponse.json(
      { error: "Failed to update roster", details: String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ ageGroup: string }> }
) {
  try {
    const { ageGroup: encodedAgeGroup } = await params;
    const ageGroup = decodeURIComponent(encodedAgeGroup);
    console.log("[DELETE] Deleting roster:", ageGroup);

    const client = await clientPromise;
    const db = client.db("hockey-app");
    const rostersCollection = db.collection("rosters");

    const result = await rostersCollection.deleteOne({ ageGroup });

    if (result.deletedCount === 0) {
      console.log("[DELETE] Roster not found:", ageGroup);
      return NextResponse.json({ error: "Roster not found" }, { status: 404 });
    }

    console.log("[DELETE] Successfully deleted:", ageGroup);

    return NextResponse.json({ message: "Roster deleted successfully" });
  } catch (error) {
    console.error("[DELETE] Error:", error);
    return NextResponse.json(
      { error: "Failed to delete roster" },
      { status: 500 }
    );
  }
}
