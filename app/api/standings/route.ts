// GET /api/standings?seasonCompetitionId=...&includeRollups=1
// Public standings derived from approved fixture results (E4, E5, E8).

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getSeasonCompetitionStandingsReadBundle } from "@/lib/competitions/standingsBundle";
import { getPublicTenantFromRequest } from "@/lib/tenant/requestTenant";
import { seasonCompetitionVisibleForPortalTenant } from "@/lib/tenant/seasonCompetitionTenantGate";

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

    const includeRollups =
      (request.nextUrl.searchParams.get("includeRollups") ?? "") === "1";

    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || "hockey-app");

    const sc = await db.collection("season_competitions").findOne({
      seasonCompetitionId,
    });
    if (!sc) {
      return NextResponse.json(
        { error: "Season competition not found" },
        { status: 404 },
      );
    }

    const tenant = await getPublicTenantFromRequest(request);
    const owner = String(sc.owningAssociationId ?? "");
    const visible = await seasonCompetitionVisibleForPortalTenant(
      db,
      owner,
      tenant,
    );
    if (!visible) {
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
    const owningAssociationId = String(sc.owningAssociationId ?? "");

    const { standings, rollups } = await getSeasonCompetitionStandingsReadBundle({
      seasonCompetitionId,
      owningAssociationId,
      ladderRules: rules,
      requiresResultApproval: requiresApproval,
      publishedOnly: true,
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
    console.error("GET /api/standings error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
