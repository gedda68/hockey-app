// GET /api/standings?seasonCompetitionId=...
// Public standings derived from approved fixture results (E4).

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { computeSeasonCompetitionStandings } from "@/lib/competitions/standings";

const PUBLIC_SC_STATUSES = new Set(["published", "in_progress", "completed"]);

export async function GET(request: NextRequest) {
  try {
    const seasonCompetitionId =
      request.nextUrl.searchParams.get("seasonCompetitionId")?.trim() ?? "";
    if (!seasonCompetitionId) {
      return NextResponse.json(
        { error: "Query parameter seasonCompetitionId is required" },
        { status: 400 },
      );
    }

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

    const status = sc.status as string | undefined;
    if (!status || !PUBLIC_SC_STATUSES.has(status)) {
      return NextResponse.json({ seasonCompetitionId, standings: [] });
    }

    const rules = sc.ladderRules ?? {};
    const requiresApproval = Boolean(sc.resultApprovalRequired);
    const standings = await computeSeasonCompetitionStandings({
      db,
      seasonCompetitionId,
      ladderRules: rules,
      requiresResultApproval: requiresApproval,
      publishedOnly: true,
    });

    return NextResponse.json({
      seasonCompetitionId,
      season: sc.season ?? null,
      requiresResultApproval: requiresApproval,
      ladderRules: sc.ladderRules ?? null,
      standings,
    });
  } catch (error: unknown) {
    console.error("GET /api/standings error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

