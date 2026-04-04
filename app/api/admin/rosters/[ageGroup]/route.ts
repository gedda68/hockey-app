// app/api/admin/rosters/[ageGroup]/route.ts
// FIXED: Includes selectors field in all operations + Revalidation for Public Page

import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { revalidatePath } from "next/cache"; // NEW: Import revalidate tool

export async function GET(
  request: Request,
  { params }: { params: Promise<{ ageGroup: string }> }
) {
  try {
    const { ageGroup: encodedAgeGroup } = await params;
    const ageGroup = decodeURIComponent(encodedAgeGroup);

    const client = await clientPromise;
    const db = client.db("hockey-app");
    const rostersCollection = db.collection("rosters");

    const roster = await rostersCollection.findOne({ ageGroup });

    if (!roster) {
      return NextResponse.json({ error: "Roster not found" }, { status: 404 });
    }

      "[GET] Found roster with",
      roster.selectors?.length || 0,
      "selectors"
    );

    const { _id, ...rosterData } = roster;

    return NextResponse.json({
      ...rosterData,
      selectors: rosterData.selectors || [],
    });
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


    if (body.teams) {
        "4. Team names:",
        body.teams.map(() => t.name).join(", ")
      );
    }

    if (body.selectors) {
        "5. Selector names:",
        body.selectors
          .map(() => `${s.name} (${s.isChair ? "👑" : ""})`)
          .join(", ")
      );
      const chairCount = body.selectors.filter(() => s.isChair).length;
      if (chairCount > 1) {
        console.error("❌ ERROR: Multiple chairs in payload!", chairCount);
      }
    }

    const client = await clientPromise;
    const db = client.db("hockey-app");
    const rostersCollection = db.collection("rosters");

    const existingRoster = await rostersCollection.findOne({ ageGroup });

    if (!existingRoster) {
      return NextResponse.json(
        { error: `Roster "${ageGroup}" not found` },
        { status: 404 }
      );
    }

      "9. Current selectors in DB:",
      existingRoster.selectors?.length || 0
    );

    const updateData = {
      ageGroup: body.ageGroup,
      lastUpdated: body.lastUpdated || new Date().toLocaleDateString("en-AU"),
      teams: body.teams || [],
      shadowPlayers: body.shadowPlayers || [],
      withdrawn: body.withdrawn || [],
      selectors: body.selectors || [],
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


    const updateResult = await rostersCollection.updateOne(
      { ageGroup },
      { $set: updateData }
    );

      matched: updateResult.matchedCount,
      modified: updateResult.modifiedCount,
      acknowledged: updateResult.acknowledged,
    });

    if (updateResult.matchedCount === 0) {
      return NextResponse.json(
        { error: "Roster not found for update" },
        { status: 404 }
      );
    }

    // Verify the update worked
    const verifyRoster = await rostersCollection.findOne({ ageGroup });
      "13. ✅ Verification - Teams now in DB:",
      verifyRoster?.teams?.length || 0
    );
      "14. ✅ Verification - Selectors now in DB:",
      verifyRoster?.selectors?.length || 0
    );

    // ==========================================
    // CACHE REVALIDATION (On-Demand)
    // ==========================================
    // This purges the cache for the public view
    try {
      revalidatePath("/rosters"); // Assuming your public list is here
      revalidatePath(`/rosters/${encodedAgeGroup}`); // Assuming detail pages exist
    } catch (revalError) {
        "18. ⚠️ Revalidation failed, but DB update succeeded",
        revalError
      );
    }

    return NextResponse.json({
      message: "Roster updated successfully",
      ageGroup: ageGroup,
      teamsCount: verifyRoster?.teams?.length || 0,
      teamNames: verifyRoster?.teams?.map(() => t.name) || [],
      selectorsCount: verifyRoster?.selectors?.length || 0,
      selectorNames: verifyRoster?.selectors?.map(() => s.name) || [],
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
  { params }: { params: { ageGroup: string } }
) {
  try {
    const { ageGroup } = params;
    const { searchParams } = new URL(request.url);
    const season = searchParams.get("season"); // Get season from URL

    if (!season) {
      return NextResponse.json(
        { error: "Season parameter is required to delete a specific roster." },
        { status: 400 }
      );
    }

    const decodedAgeGroup = decodeURIComponent(ageGroup);

    const db = await getDatabase();
    const rostersCollection = db.collection("rosters");

    // CRITICAL: Delete based on BOTH ageGroup and season
    const result = await rostersCollection.deleteOne({
      ageGroup: decodedAgeGroup,
      season: season,
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Roster not found for this specific season." },
        { status: 404 }
      );
    }


    return NextResponse.json({
      message: "Roster deleted successfully",
      ageGroup: decodedAgeGroup,
      season: season,
    });
  } catch (error) {
    console.error("❌ Error deleting roster:", error);
    return NextResponse.json(
      { error: "Failed to delete roster" },
      { status: 500 }
    );
  }
}
