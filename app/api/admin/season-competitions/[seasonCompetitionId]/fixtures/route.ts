// GET /api/admin/season-competitions/[seasonCompetitionId]/fixtures
// List all fixtures for a season competition (admin).

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import {
  requireAnyPermission,
  requireResourceAccess,
} from "@/lib/auth/middleware";

type Params = { params: Promise<{ seasonCompetitionId: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const { response } = await requireAnyPermission(request, [
    "competitions.manage",
    "competitions.fixtures",
  ]);
  if (response) return response;

  try {
    const { seasonCompetitionId } = await params;
    const client = await clientPromise;
    const db = client.db("hockey-app");

    const sc = await db.collection("season_competitions").findOne({
      seasonCompetitionId,
    });
    if (!sc) {
      return NextResponse.json(
        { error: "Season competition not found" },
        { status: 404 },
      );
    }

    const scope = await requireResourceAccess(
      request,
      "association",
      sc.owningAssociationId as string,
    );
    if (scope.response) return scope.response;

    const fixtures = await db
      .collection("league_fixtures")
      .find({ seasonCompetitionId })
      .sort({ round: 1, scheduledStart: 1, fixtureId: 1 })
      .toArray();

    return NextResponse.json({
      seasonCompetitionId,
      fixtures: fixtures.map((f) => ({
        ...f,
        _id: f._id?.toString?.(),
      })),
    });
  } catch (error: unknown) {
    console.error("GET admin season-competitions fixtures error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
