// app/api/admin/rosters/[ageGroup]/route.ts
// Includes selectors field in all operations + revalidation for public pages

import { NextRequest, NextResponse } from "next/server";
import clientPromise, { getDatabase } from "@/lib/mongodb";
import { revalidatePath } from "next/cache";
import {
  requirePermission,
  requireResourceAccess,
} from "@/lib/auth/middleware";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ageGroup: string }> },
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

    const { response: authRes } = await requirePermission(request, "team.roster");
    if (authRes) return authRes;
    const clubId = (roster as { clubId?: string }).clubId;
    if (clubId) {
      const { response: scopeRes } = await requireResourceAccess(
        request,
        "club",
        clubId,
      );
      if (scopeRes) return scopeRes;
    }

    console.log(
      "[GET] Found roster with",
      roster.selectors?.length || 0,
      "selectors",
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
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ ageGroup: string }> },
) {
  try {
    const { ageGroup: encodedAgeGroup } = await params;
    const ageGroup = decodeURIComponent(encodedAgeGroup);

    const client = await clientPromise;
    const dbEarly = client.db("hockey-app");
    const existingEarly = await dbEarly.collection("rosters").findOne({ ageGroup });
    if (!existingEarly) {
      return NextResponse.json(
        { error: `Roster "${ageGroup}" not found` },
        { status: 404 },
      );
    }

    const { response: permRes } = await requirePermission(request, "team.edit");
    if (permRes) return permRes;
    const clubIdEarly = (existingEarly as { clubId?: string }).clubId;
    if (clubIdEarly) {
      const { response: scopeRes } = await requireResourceAccess(
        request,
        "club",
        clubIdEarly,
      );
      if (scopeRes) return scopeRes;
    }

    const body = await request.json();

    if (body.teams) {
      console.log(
        "4. Team names:",
        body.teams.map((t: { name?: string }) => t.name).join(", "),
      );
    }

    if (body.selectors) {
      console.log(
        "5. Selector names:",
        body.selectors
          .map(
            (s: { name?: string; isChair?: boolean }) =>
              `${s.name} (${s.isChair ? "chair" : ""})`,
          )
          .join(", "),
      );
      const chairCount = body.selectors.filter(
        (s: { isChair?: boolean }) => s.isChair,
      ).length;
      if (chairCount > 1) {
        console.error("❌ ERROR: Multiple chairs in payload!", chairCount);
      }
    }

    const db = client.db("hockey-app");
    const rostersCollection = db.collection("rosters");

    const existingRoster = existingEarly;

    console.log("9. Current selectors in DB:", existingRoster.selectors?.length || 0);

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
      { $set: updateData },
    );

    console.log("Update result:", {
      matched: updateResult.matchedCount,
      modified: updateResult.modifiedCount,
      acknowledged: updateResult.acknowledged,
    });

    if (updateResult.matchedCount === 0) {
      return NextResponse.json(
        { error: "Roster not found for update" },
        { status: 404 },
      );
    }

    const verifyRoster = await rostersCollection.findOne({ ageGroup });
    console.log(
      "13. Verification - Teams now in DB:",
      verifyRoster?.teams?.length || 0,
    );
    console.log(
      "14. Verification - Selectors now in DB:",
      verifyRoster?.selectors?.length || 0,
    );

    try {
      revalidatePath("/rosters");
      revalidatePath(`/rosters/${encodedAgeGroup}`);
    } catch (revalError) {
      console.warn(
        "18. Revalidation failed, but DB update succeeded",
        revalError,
      );
    }

    return NextResponse.json({
      message: "Roster updated successfully",
      ageGroup: ageGroup,
      teamsCount: verifyRoster?.teams?.length || 0,
      teamNames: verifyRoster?.teams?.map((t: { name?: string }) => t.name) || [],
      selectorsCount: verifyRoster?.selectors?.length || 0,
      selectorNames:
        verifyRoster?.selectors?.map((s: { name?: string }) => s.name) || [],
    });
  } catch (error) {
    console.error("❌ PUT Error:", error);
    return NextResponse.json(
      { error: "Failed to update roster", details: String(error) },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ ageGroup: string }> },
) {
  try {
    const { ageGroup } = await params;
    const { searchParams } = new URL(request.url);
    const season = searchParams.get("season");

    if (!season) {
      return NextResponse.json(
        { error: "Season parameter is required to delete a specific roster." },
        { status: 400 },
      );
    }

    const decodedAgeGroup = decodeURIComponent(ageGroup);

    const db = await getDatabase();
    const rostersCollection = db.collection("rosters");

    const rosterDoc = await rostersCollection.findOne({
      ageGroup: decodedAgeGroup,
      season: season,
    });
    if (!rosterDoc) {
      return NextResponse.json(
        { error: "Roster not found for this specific season." },
        { status: 404 },
      );
    }

    const { response: delPermRes } = await requirePermission(request, "team.edit");
    if (delPermRes) return delPermRes;
    const delClubId = (rosterDoc as { clubId?: string }).clubId;
    if (delClubId) {
      const { response: scopeRes } = await requireResourceAccess(
        request,
        "club",
        delClubId,
      );
      if (scopeRes) return scopeRes;
    }

    const result = await rostersCollection.deleteOne({
      ageGroup: decodedAgeGroup,
      season: season,
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Roster not found for this specific season." },
        { status: 404 },
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
      { status: 500 },
    );
  }
}
