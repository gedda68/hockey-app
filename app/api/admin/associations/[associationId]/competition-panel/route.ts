// GET /api/admin/associations/[associationId]/competition-panel?season=2026
// Overview of every competition the association runs in a season.

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { requireAnyPermission, requireResourceAccess } from "@/lib/auth/middleware";
import { formatSeasonLabel } from "@/lib/competitions/seasonLabel";
import { summariseFixtures, type PanelFixture } from "@/lib/competitions/panelOverview";

type Params = { params: Promise<{ associationId: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { associationId } = await params;
    const { response } = await requireAnyPermission(request, [
      "competitions.manage",
      "competitions.fixtures",
      "results.manage",
      "results.approve",
    ]);
    if (response) return response;
    const scope = await requireResourceAccess(request, "association", associationId);
    if (scope.response) return scope.response;

    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || "hockey-app");

    const all = await db
      .collection("season_competitions")
      .find({ owningAssociationId: associationId })
      .project({ _id: 0, seasonCompetitionId: 1, competitionId: 1, season: 1, status: 1, displayName: 1, competitionName: 1 })
      .toArray();
    const seasons = [...new Set(all.map((r) => String(r.season)))].sort().reverse();
    const only = request.nextUrl.searchParams.get("seasonCompetitionId");
    const onlyRow = only ? all.find((r) => r.seasonCompetitionId === only) : null;
    const requested = onlyRow ? String(onlyRow.season) : request.nextUrl.searchParams.get("season");
    const season = requested && seasons.includes(requested) ? requested : seasons.includes("2026") ? "2026" : seasons[0] ?? null;

    const rows = all.filter(
      (r) => String(r.season) === season && (!onlyRow || r.seasonCompetitionId === only),
    );
    const ids = rows.map((r) => r.seasonCompetitionId as string);
    const fixtures = ids.length
      ? await db
          .collection("league_fixtures")
          .find({ seasonCompetitionId: { $in: ids } })
          .project({ _id: 0, seasonCompetitionId: 1, homeTeamId: 1, awayTeamId: 1, status: 1, scheduledStart: 1, resultStatus: 1 })
          .toArray()
      : [];
    const bySc = new Map<string, PanelFixture[]>();
    for (const f of fixtures) {
      const k = f.seasonCompetitionId as string;
      (bySc.get(k) ?? bySc.set(k, []).get(k)!).push(f as PanelFixture);
    }

    const competitions = rows
      .map((r) => ({
        seasonCompetitionId: r.seasonCompetitionId as string,
        status: r.status as string,
        label: formatSeasonLabel({ season: r.season, displayName: r.displayName, competitionName: r.competitionName }),
        summary: summariseFixtures(bySc.get(r.seasonCompetitionId as string) ?? []),
      }))
      .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));

    return NextResponse.json({ season, seasons, competitions });
  } catch (e) {
    console.error("competition-panel GET failed:", e);
    return NextResponse.json({ error: "Failed to load competition panel" }, { status: 500 });
  }
}
