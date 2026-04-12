// GET /api/fixtures?seasonCompetitionId=...
// Published fixtures only; season competition must be visible (not draft/archived).

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getPublicTenantFromRequest } from "@/lib/tenant/requestTenant";
import { seasonCompetitionVisibleForPortalTenant } from "@/lib/tenant/seasonCompetitionTenantGate";

const PUBLIC_SC_STATUSES = new Set([
  "published",
  "in_progress",
  "completed",
]);

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
      return NextResponse.json({ seasonCompetitionId, fixtures: [] });
    }

    const requiresApproval = Boolean(sc.resultApprovalRequired);

    const raw = await db
      .collection("league_fixtures")
      .find({
        seasonCompetitionId,
        published: true,
      })
      .sort({ round: 1, scheduledStart: 1, fixtureId: 1 })
      .toArray();

    const teamIds = new Set<string>();
    for (const f of raw) {
      if (f.homeTeamId) teamIds.add(f.homeTeamId as string);
      if (f.awayTeamId) teamIds.add(f.awayTeamId as string);
    }

    const teams =
      teamIds.size > 0
        ? await db
            .collection("teams")
            .find({ teamId: { $in: [...teamIds] } })
            .project({ teamId: 1, name: 1 })
            .toArray()
        : [];

    const nameById = new Map<string, string>();
    for (const t of teams) {
      if (t.teamId && t.name) nameById.set(t.teamId as string, t.name as string);
    }

    const fixtures = raw.map((f) => ({
      fixtureId: f.fixtureId,
      seasonCompetitionId: f.seasonCompetitionId,
      competitionId: f.competitionId,
      round: f.round,
      homeTeamId: f.homeTeamId,
      awayTeamId: f.awayTeamId,
      homeTeamName: nameById.get(f.homeTeamId as string) ?? null,
      awayTeamName: nameById.get(f.awayTeamId as string) ?? null,
      status: f.status,
      venueName: f.venueName ?? null,
      addressLine: f.addressLine ?? null,
      scheduledStart: f.scheduledStart ?? null,
      scheduledEnd: f.scheduledEnd ?? null,
      timezone: f.timezone ?? null,
      result:
        (f.resultStatus === "approved" ||
          (!requiresApproval && f.result && f.status === "completed")) &&
        f.result
          ? f.result
          : null,
      matchEvents:
        (f.resultStatus === "approved" ||
          (!requiresApproval && f.result && f.status === "completed")) &&
        Array.isArray(f.matchEvents)
          ? f.matchEvents
          : null,
    }));

    return NextResponse.json({
      seasonCompetitionId,
      season: sc.season ?? null,
      requiresResultApproval: requiresApproval,
      fixtures,
    });
  } catch (error: unknown) {
    console.error("GET /api/fixtures error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
