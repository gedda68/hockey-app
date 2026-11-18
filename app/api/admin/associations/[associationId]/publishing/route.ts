// GET /api/admin/associations/[associationId]/publishing?season=2027
// Every competition of a season with its status and how many matches of each round are published.

import { areaGuard } from "@/lib/access/enforce";
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { requireAnyPermission, requireResourceAccess } from "@/lib/auth/middleware";
import { formatSeasonLabel } from "@/lib/competitions/seasonLabel";
import { summariseRounds } from "@/lib/competitions/publishing";

type Params = { params: Promise<{ associationId: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const areaDenied = await areaGuard("competitions", "GET");
  if (areaDenied) return areaDenied;
  try {
    const { associationId } = await params;
    const { response } = await requireAnyPermission(request, ["competitions.manage", "competitions.fixtures"]);
    if (response) return response;
    const scope = await requireResourceAccess(request, "association", associationId);
    if (scope.response) return scope.response;

    const db = (await clientPromise).db(process.env.DB_NAME || "hockey-app");
    const all = await db.collection("season_competitions").find({ owningAssociationId: associationId }).project({ _id: 0, seasonCompetitionId: 1, competitionId: 1, season: 1, status: 1, displayName: 1, competitionName: 1 }).toArray();
    const seasons = [...new Set(all.map((r) => String(r.season)))].sort().reverse();
    const asked = request.nextUrl.searchParams.get("season");
    const season = asked && seasons.includes(asked) ? asked : seasons[0] ?? null;
    const rows = all.filter((r) => String(r.season) === season);
    const comps = await db.collection("competitions").find({ competitionId: { $in: rows.map((r) => r.competitionId) } }).project({ competitionId: 1, name: 1 }).toArray();
    const nameOf = new Map(comps.map((c) => [String(c.competitionId), String(c.name ?? "")]));
    const fx = rows.length ? await db.collection("league_fixtures").find({ seasonCompetitionId: { $in: rows.map((r) => r.seasonCompetitionId) } }).project({ _id: 0, seasonCompetitionId: 1, round: 1, published: 1, matchLevel: 1, status: 1 }).toArray() : [];
    const divisions = rows.map((r) => {
      const mine = fx.filter((f) => f.seasonCompetitionId === r.seasonCompetitionId);
      const rounds = summariseRounds(mine);
      return {
        seasonCompetitionId: String(r.seasonCompetitionId), status: String(r.status ?? "draft"),
        label: formatSeasonLabel({ season: r.season, displayName: r.displayName, competitionName: r.competitionName || nameOf.get(String(r.competitionId)) }),
        total: rounds.reduce((n, x) => n + x.total, 0), published: rounds.reduce((n, x) => n + x.published, 0), rounds,
      };
    }).sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
    return NextResponse.json({ season, seasons, divisions });
  } catch (e) {
    console.error("publishing GET failed:", e);
    return NextResponse.json({ error: "Failed to load publishing" }, { status: 500 });
  }
}
