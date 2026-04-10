// lib/competitions/seasonStatsRollup.ts
// Team / club / association roll-ups for a season competition (E5).

import type { Db } from "mongodb";
import type { LadderRules, StandingsRow, TeamStandingsAccumulator } from "./standings";
import {
  accumulateStandingsRowsFromFixtures,
  loadLeagueFixturesForStandings,
} from "./standings";

export type TeamRollupRow = StandingsRow & {
  clubId: string | null;
  clubName: string | null;
};

export type ClubRollupRow = {
  pos: number;
  clubId: string;
  clubName: string | null;
  teamsRepresented: number;
  p: number;
  w: number;
  d: number;
  l: number;
  gf: number;
  ga: number;
  gd: number;
  pts: number;
};

export type AssociationRollupSummary = {
  owningAssociationId: string;
  seasonCompetitionId: string;
  matchesPlayed: number;
  totalGoals: number;
  teamsWithResults: number;
  clubsRepresented: number;
};

function sortRollupRows<
  T extends {
    pts: number;
    gd: number;
    gf: number;
    clubId?: string | null;
    teamId?: string | null;
  },
>(rows: T[], idKey: keyof T): T[] {
  return [...rows].sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    if (b.gd !== a.gd) return b.gd - a.gd;
    if (b.gf !== a.gf) return b.gf - a.gf;
    return String(a[idKey]).localeCompare(String(b[idKey]));
  });
}

/**
 * Build E5 rollups from an already accumulated row map (single fixture pass when
 * combined with standings finalization).
 */
export async function enrichRollupsFromRowMap(opts: {
  db: Db;
  rowMap: Map<string, TeamStandingsAccumulator>;
  seasonCompetitionId: string;
  owningAssociationId: string;
}): Promise<{
  teams: TeamRollupRow[];
  clubs: ClubRollupRow[];
  association: AssociationRollupSummary;
}> {
  const { db, rowMap, seasonCompetitionId, owningAssociationId } = opts;

  const teamIds = [...rowMap.keys()];
  const teams =
    teamIds.length > 0
      ? await db
          .collection("teams")
          .find({ teamId: { $in: teamIds } })
          .project({ teamId: 1, name: 1, clubId: 1 })
          .toArray()
      : [];

  const nameById = new Map<string, string>();
  const clubByTeam = new Map<string, string>();
  for (const t of teams) {
    const tid = String(t.teamId ?? "");
    if (t.name) nameById.set(tid, String(t.name));
    if (t.clubId) clubByTeam.set(tid, String(t.clubId));
  }

  const clubIds = [...new Set([...clubByTeam.values()])];
  const clubs =
    clubIds.length > 0
      ? await db
          .collection("clubs")
          .find({ clubId: { $in: clubIds } })
          .project({ clubId: 1, name: 1 })
          .toArray()
      : [];
  const clubNameById = new Map<string, string>();
  for (const c of clubs) {
    if (c.clubId && c.name) clubNameById.set(String(c.clubId), String(c.name));
  }

  const teamRowsUnsorted: TeamRollupRow[] = [...rowMap.values()].map((r) => {
    const clubId = clubByTeam.get(r.teamId) ?? null;
    return {
      pos: 0,
      teamId: r.teamId,
      teamName: nameById.get(r.teamId) ?? null,
      clubId,
      clubName: clubId ? (clubNameById.get(clubId) ?? null) : null,
      p: r.p,
      w: r.w,
      d: r.d,
      l: r.l,
      gf: r.gf,
      ga: r.ga,
      gd: r.gf - r.ga,
      pts: r.pts,
    };
  });

  const sortedTeams = sortRollupRows(teamRowsUnsorted, "teamId").map((row, idx) => ({
    ...row,
    pos: idx + 1,
  }));

  const clubAgg = new Map<
    string,
    Omit<ClubRollupRow, "pos" | "clubName"> & { teamsRepresented: number }
  >();

  for (const r of rowMap.values()) {
    const clubId = clubByTeam.get(r.teamId);
    if (!clubId) continue;
    if (!clubAgg.has(clubId)) {
      clubAgg.set(clubId, {
        clubId,
        teamsRepresented: 0,
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
    const c = clubAgg.get(clubId)!;
    c.teamsRepresented += 1;
    c.p += r.p;
    c.w += r.w;
    c.d += r.d;
    c.l += r.l;
    c.gf += r.gf;
    c.ga += r.ga;
    c.pts += r.pts;
  }

  const clubRowsUnsorted: ClubRollupRow[] = [...clubAgg.values()].map((c) => ({
    pos: 0,
    clubId: c.clubId,
    clubName: clubNameById.get(c.clubId) ?? null,
    teamsRepresented: c.teamsRepresented,
    p: c.p,
    w: c.w,
    d: c.d,
    l: c.l,
    gf: c.gf,
    ga: c.ga,
    gd: c.gf - c.ga,
    pts: c.pts,
  }));

  const sortedClubs = sortRollupRows(clubRowsUnsorted, "clubId").map((row, idx) => ({
    ...row,
    pos: idx + 1,
  }));

  const sumP = [...rowMap.values()].reduce((s, r) => s + r.p, 0);
  const totalGoals = [...rowMap.values()].reduce((s, r) => s + r.gf, 0);
  const teamsWithResults = [...rowMap.values()].filter((r) => r.p > 0).length;

  const association: AssociationRollupSummary = {
    owningAssociationId,
    seasonCompetitionId,
    matchesPlayed: sumP > 0 ? Math.round(sumP / 2) : 0,
    totalGoals,
    teamsWithResults,
    clubsRepresented: clubAgg.size,
  };

  return {
    teams: sortedTeams,
    clubs: sortedClubs,
    association,
  };
}

/**
 * E5: same ladder rows as standings, plus club attribution; club totals;
 * association-wide summary (all teams in this season competition).
 */
export async function computeSeasonCompetitionRollups(opts: {
  db: Db;
  seasonCompetitionId: string;
  owningAssociationId: string;
  ladderRules?: LadderRules | null;
  requiresResultApproval: boolean;
  publishedOnly?: boolean;
}): Promise<{
  teams: TeamRollupRow[];
  clubs: ClubRollupRow[];
  association: AssociationRollupSummary;
}> {
  const {
    db,
    seasonCompetitionId,
    owningAssociationId,
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

  return enrichRollupsFromRowMap({
    db,
    rowMap,
    seasonCompetitionId,
    owningAssociationId,
  });
}
