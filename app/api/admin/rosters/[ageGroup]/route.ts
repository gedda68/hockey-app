// app/api/admin/rosters/[ageGroup]/route.ts

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
      const { response: scopeRes } = await requireResourceAccess(request, "club", clubId);
      if (scopeRes) return scopeRes;
    }

    const { _id, ...rosterData } = roster;
    void _id;

    return NextResponse.json({
      ...rosterData,
      selectors: rosterData.selectors || [],
    });
  } catch (error) {
    console.error("[rosters/GET] Error:", error);
    return NextResponse.json({ error: "Failed to fetch roster" }, { status: 500 });
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
    const db = client.db("hockey-app");
    const existing = await db.collection("rosters").findOne({ ageGroup });
    if (!existing) {
      return NextResponse.json(
        { error: `Roster "${ageGroup}" not found` },
        { status: 404 },
      );
    }

    const { response: permRes } = await requirePermission(request, "team.edit");
    if (permRes) return permRes;
    const clubIdEarly = (existing as { clubId?: string }).clubId;
    if (clubIdEarly) {
      const { response: scopeRes } = await requireResourceAccess(request, "club", clubIdEarly);
      if (scopeRes) return scopeRes;
    }

    const body = await request.json();

    // Validate: at most one selector can be chair
    if (body.selectors) {
      const chairCount = (body.selectors as { isChair?: boolean }[]).filter((s) => s.isChair).length;
      if (chairCount > 1) {
        return NextResponse.json(
          { error: "Only one selector can be designated as chair" },
          { status: 400 },
        );
      }
    }

    const updateData = {
      ageGroup: body.ageGroup,
      lastUpdated: body.lastUpdated || new Date().toLocaleDateString("en-AU"),
      teams: body.teams || [],
      shadowPlayers: body.shadowPlayers || [],
      withdrawn: body.withdrawn || [],
      selectors: body.selectors || [],
      trialInfo: body.trialInfo !== undefined ? body.trialInfo : existing.trialInfo,
      trainingInfo: body.trainingInfo !== undefined ? body.trainingInfo : existing.trainingInfo,
      tournamentInfo: body.tournamentInfo !== undefined ? body.tournamentInfo : existing.tournamentInfo,
    };

    const updateResult = await db
      .collection("rosters")
      .updateOne({ ageGroup }, { $set: updateData });

    if (updateResult.matchedCount === 0) {
      return NextResponse.json({ error: "Roster not found for update" }, { status: 404 });
    }

    const updated = await db.collection("rosters").findOne({ ageGroup });

    try {
      revalidatePath("/rosters");
      revalidatePath(`/rosters/${encodedAgeGroup}`);
    } catch (revalError) {
      console.warn("[rosters/PUT] Revalidation failed (DB update succeeded):", revalError);
    }

    return NextResponse.json({
      message: "Roster updated successfully",
      ageGroup,
      teamsCount: updated?.teams?.length || 0,
      teamNames: (updated?.teams as { name?: string }[] | undefined)?.map((t) => t.name) || [],
      selectorsCount: updated?.selectors?.length || 0,
      selectorNames: (updated?.selectors as { name?: string }[] | undefined)?.map((s) => s.name) || [],
    });
  } catch (error) {
    console.error("[rosters/PUT] Error:", error);
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

    const rosterDoc = await db.collection("rosters").findOne({
      ageGroup: decodedAgeGroup,
      season,
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
      const { response: scopeRes } = await requireResourceAccess(request, "club", delClubId);
      if (scopeRes) return scopeRes;
    }

    const result = await db.collection("rosters").deleteOne({
      ageGroup: decodedAgeGroup,
      season,
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
      season,
    });
  } catch (error) {
    console.error("[rosters/DELETE] Error:", error);
    return NextResponse.json({ error: "Failed to delete roster" }, { status: 500 });
  }
}
