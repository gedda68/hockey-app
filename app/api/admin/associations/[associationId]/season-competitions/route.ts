// GET /api/admin/associations/[associationId]/season-competitions
// Minimal list for treasurer / honoraria UI (association.fees).

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import {
  requireAnyPermission,
  requireResourceAccess,
} from "@/lib/auth/middleware";

type Params = { params: Promise<{ associationId: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { associationId } = await params;

    const { response: authRes } = await requireAnyPermission(request, [
      "association.fees",
      "competitions.manage",
      "competitions.fixtures",
      "results.manage",
    ]);
    if (authRes) return authRes;
    const { response: scopeRes } = await requireResourceAccess(
      request,
      "association",
      associationId,
    );
    if (scopeRes) return scopeRes;

    const client = await clientPromise;
    const db = client.db("hockey-app");

    const rows = await db
      .collection("season_competitions")
      .find({ owningAssociationId: associationId })
      .project({
        seasonCompetitionId: 1,
        competitionId: 1,
        season: 1,
        status: 1,
      })
      .sort({ season: -1, seasonCompetitionId: 1 })
      .toArray();

    return NextResponse.json({
      seasonCompetitions: rows.map((r) => ({
        seasonCompetitionId: r.seasonCompetitionId,
        competitionId: r.competitionId,
        season: r.season,
        status: r.status,
      })),
    });
  } catch (error) {
    console.error("GET association season-competitions error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
