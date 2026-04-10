// GET /api/admin/season-competitions/[seasonCompetitionId]/standings
// Admin standings preview (includes unpublished fixtures too by default) (E4, E5, E8).

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import {
  requireAnyPermission,
  requireResourceAccess,
} from "@/lib/auth/middleware";
import { getSeasonCompetitionStandingsReadBundle } from "@/lib/competitions/standingsBundle";

type Params = { params: Promise<{ seasonCompetitionId: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const { response } = await requireAnyPermission(request, [
    "competitions.manage",
    "competitions.fixtures",
  ]);
  if (response) return response;

  try {
    const { seasonCompetitionId } = await params;
    const includeUnpublished =
      (request.nextUrl.searchParams.get("includeUnpublished") ?? "1") === "1";
    const includeRollups =
      (request.nextUrl.searchParams.get("includeRollups") ?? "") === "1";

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

    const requiresApproval = Boolean(sc.resultApprovalRequired);
    const owningAssociationId = String(sc.owningAssociationId ?? "");

    const { standings, rollups } = await getSeasonCompetitionStandingsReadBundle({
      seasonCompetitionId,
      owningAssociationId,
      ladderRules: sc.ladderRules ?? null,
      requiresResultApproval: requiresApproval,
      publishedOnly: !includeUnpublished,
      includeRollups,
    });

    return NextResponse.json({
      seasonCompetitionId,
      season: sc.season ?? null,
      requiresResultApproval: requiresApproval,
      ladderRules: sc.ladderRules ?? null,
      standings,
      ...(includeRollups && rollups ? { rollups } : {}),
    });
  } catch (error: unknown) {
    console.error("GET admin standings error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
