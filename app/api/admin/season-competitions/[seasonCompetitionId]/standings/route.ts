// GET /api/admin/season-competitions/[seasonCompetitionId]/standings
// Admin standings preview (includes unpublished fixtures too by default) (E4).

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { requirePermission, requireResourceAccess } from "@/lib/auth/middleware";
import { computeSeasonCompetitionStandings } from "@/lib/competitions/standings";

type Params = { params: Promise<{ seasonCompetitionId: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const { response } = await requirePermission(request, "competitions.manage");
  if (response) return response;

  try {
    const { seasonCompetitionId } = await params;
    const includeUnpublished =
      (request.nextUrl.searchParams.get("includeUnpublished") ?? "1") === "1";

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
    const standings = await computeSeasonCompetitionStandings({
      db,
      seasonCompetitionId,
      ladderRules: sc.ladderRules ?? null,
      requiresResultApproval: requiresApproval,
      publishedOnly: !includeUnpublished,
    });

    return NextResponse.json({
      seasonCompetitionId,
      season: sc.season ?? null,
      requiresResultApproval: requiresApproval,
      ladderRules: sc.ladderRules ?? null,
      standings,
    });
  } catch (error: unknown) {
    console.error("GET admin standings error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

