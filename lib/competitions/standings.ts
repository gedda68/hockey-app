// lib/competitions/standings.ts
// Compute ladder/standings for a season competition (E4, E5, E8 helpers).

import type { Db } from "mongodb";

export type StandingsRow = {
  pos: number;
  teamId: string;
  teamName: string | null;
  p: number;
  w: number;
  d: number;
  l: number;
  gf: number;
  ga: number;
  gd: number;
  pts: number;
};

export type LadderRules = {
  pointsWin?: number;
  pointsDraw?: number;
  pointsLoss?: number;
  pointsForfeitWin?: number;
  pointsForfeitLoss?: number;
  pointsShootoutWin?: number;
  pointsShootoutLoss?: number;
  tieBreakers?: Array<"points" | "gd" | "gf" | "h2h">;
  includeAbandonedInPlayed?: boolean;
};

/** Row before ladder position and display name enrichment (E5 rollups). */
export type TeamStandingsAccumulator = Omit<StandingsRow, "pos" | "teamName">;

function safeInt(v: unknown): number | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  return Math.trunc(v);
}

export async function loadLeagueFixturesForStandings(
  db: Db,
  seasonCompetitionId: string,
  publishedOnly: boolean,
): Promise<Record<string, unknown>[]> {
  return db
    .collection("league_fixtures")
    .find({
      seasonCompetitionId,
      ...(publishedOnly ? { published: true } : {}),
    })
    .project({
      fixtureId: 1,
      homeTeamId: 1,
      awayTeamId: 1,
      status: 1,
      result: 1,
      resultStatus: 1,
    })
    .toArray() as Promise<Record<string, unknown>[]>;
}

/**
 * Pure accumulation from fixture docs (shared by standings + rollups).
 */
export function accumulateStandingsRowsFromFixtures(
  fixtures: Record<string, unknown>[],
  ladderRules: LadderRules | null | undefined,
  requiresResultApproval: boolean,
): Map<string, TeamStandingsAccumulator> {
  const rules = ladderRules ?? {};
  const pointsWin = Number(rules.pointsWin ?? 3);
  const pointsDraw = Number(rules.pointsDraw ?? 1);
  const pointsLoss = Number(rules.pointsLoss ?? 0);
  const pointsForfeitWin = Number(rules.pointsForfeitWin ?? pointsWin);
  const pointsForfeitLoss = Number(rules.pointsForfeitLoss ?? pointsLoss);
  const pointsShootoutWin = Number(rules.pointsShootoutWin ?? 2);
  const pointsShootoutLoss = Number(rules.pointsShootoutLoss ?? 1);
  const includeAbandonedInPlayed = Boolean(rules.includeAbandonedInPlayed);

  const rows = new Map<string, TeamStandingsAccumulator>();
  const touch = (teamId: string) => {
    if (!rows.has(teamId)) {
      rows.set(teamId, {
        teamId,
        p: 0,
        w: 0,
        d: 0,
        l: 0,
        gf: 0,
        ga: 0,
        gd: 0,
        pts: 0,
      });
    }
    return rows.get(teamId)!;
  };

  for (const f of fixtures) {
    const homeTeamId = String(f.homeTeamId ?? "");
    const awayTeamId = String(f.awayTeamId ?? "");
    if (!homeTeamId || !awayTeamId) continue;

    touch(homeTeamId);
    touch(awayTeamId);

    const isCompleted = (f.status as string | undefined) === "completed";
    const rs = (f.resultStatus as string | undefined) ?? null;
    const canUseResult = requiresResultApproval ? rs === "approved" : isCompleted;
    if (!canUseResult) continue;

    const result = (f.result ?? null) as Record<string, unknown> | null;
    if (!result) continue;

    const resultType = (result.resultType as string | undefined) ?? "normal";

    if (resultType === "abandoned" && !includeAbandonedInPlayed) continue;

    const hRow = touch(homeTeamId);
    const aRow = touch(awayTeamId);

    hRow.p += 1;
    aRow.p += 1;

    const homeScore = safeInt(result.homeScore) ?? 0;
    const awayScore = safeInt(result.awayScore) ?? 0;
    hRow.gf += homeScore;
    hRow.ga += awayScore;
    aRow.gf += awayScore;
    aRow.ga += homeScore;

    if (resultType === "forfeit") {
      const forfeitingTeamId = (result.forfeitingTeamId as string | null) ?? null;
      if (!forfeitingTeamId) continue;
      const winnerId = forfeitingTeamId === homeTeamId ? awayTeamId : homeTeamId;

      if (winnerId === homeTeamId) {
        hRow.w += 1;
        aRow.l += 1;
        hRow.pts += pointsForfeitWin;
        aRow.pts += pointsForfeitLoss;
      } else {
        aRow.w += 1;
        hRow.l += 1;
        aRow.pts += pointsForfeitWin;
        hRow.pts += pointsForfeitLoss;
      }
    } else if (resultType === "abandoned") {
      // played but no W/D/L, no points
    } else {
      if (homeScore > awayScore) {
        hRow.w += 1;
        aRow.l += 1;
        hRow.pts += pointsWin;
        aRow.pts += pointsLoss;
      } else if (awayScore > homeScore) {
        aRow.w += 1;
        hRow.l += 1;
        aRow.pts += pointsWin;
        hRow.pts += pointsLoss;
      } else {
        const sh = safeInt(result.shootoutHomeScore);
        const sa = safeInt(result.shootoutAwayScore);
        if (sh !== null && sa !== null && sh !== sa) {
          if (sh > sa) {
            hRow.w += 1;
            aRow.l += 1;
            hRow.pts += pointsShootoutWin;
            aRow.pts += pointsShootoutLoss;
          } else {
            aRow.w += 1;
            hRow.l += 1;
            aRow.pts += pointsShootoutWin;
            hRow.pts += pointsShootoutLoss;
          }
        } else {
          hRow.d += 1;
          aRow.d += 1;
          hRow.pts += pointsDraw;
          aRow.pts += pointsDraw;
        }
      }
    }
  }

  return rows;
}

export async function finalizeStandingsFromRowMap(
  db: Db,
  rowMap: Map<string, TeamStandingsAccumulator>,
): Promise<StandingsRow[]> {
  const teamIds = [...rowMap.keys()];
  const teams =
    teamIds.length > 0
      ? await db
          .collection("teams")
          .find({ teamId: { $in: teamIds } })
          .project({ teamId: 1, name: 1 })
          .toArray()
      : [];

  const nameById = new Map<string, string>();
  for (const t of teams) {
    if (t.teamId && t.name) nameById.set(String(t.teamId), String(t.name));
  }

  const standings = [...rowMap.values()].map((r) => ({
    ...r,
    teamName: nameById.get(r.teamId) ?? null,
    gd: r.gf - r.ga,
  }));

  standings.sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    if (b.gd !== a.gd) return b.gd - a.gd;
    if (b.gf !== a.gf) return b.gf - a.gf;
    return a.teamId.localeCompare(b.teamId);
  });

  return standings.map((s, idx) => ({ pos: idx + 1, ...s }));
}

export async function computeSeasonCompetitionStandings(opts: {
  db: Db;
  seasonCompetitionId: string;
  ladderRules?: LadderRules | null;
  requiresResultApproval: boolean;
  publishedOnly?: boolean;
}): Promise<StandingsRow[]> {
  const {
    db,
    seasonCompetitionId,
    ladderRules,
    requiresResultApproval,
    publishedOnly = true,
  } = opts;

  const fixtures = await loadLeagueFixturesForStandings(
    db,
    seasonCompetitionId,
    publishedOnly,
  );
  const rowMap = accumulateStandingsRowsFromFixtures(
    fixtures,
    ladderRules,
    requiresResultApproval,
  );
  return finalizeStandingsFromRowMap(db, rowMap);
}
