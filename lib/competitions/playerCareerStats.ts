// lib/competitions/playerCareerStats.ts
// Cross–season competition roll-up for one member in an association (E6 follow-up).

import type { Db } from "mongodb";
import {
  aggregatePlayerStatsForSeason,
  hasAnyPlayerStat,
  sumPlayerTotals,
  type PlayerSeasonTotals,
} from "@/lib/competitions/playerSeasonStats";

const PUBLIC_SC_STATUSES = ["published", "in_progress", "completed"] as const;

export type SeasonSlice = {
  seasonCompetitionId: string;
  season: unknown;
  competitionId: string;
  totals: PlayerSeasonTotals;
};

export async function aggregateMemberCareerInAssociation(
  db: Db,
  memberId: string,
  owningAssociationId: string,
): Promise<{ bySeason: SeasonSlice[]; career: PlayerSeasonTotals }> {
  const scs = await db
    .collection("season_competitions")
    .find({
      owningAssociationId,
      status: { $in: [...PUBLIC_SC_STATUSES] },
    })
    .project({
      seasonCompetitionId: 1,
      season: 1,
      competitionId: 1,
      resultApprovalRequired: 1,
    })
    .sort({ season: -1, seasonCompetitionId: 1 })
    .toArray();

  const scIds = scs
    .map((s) => String(s.seasonCompetitionId ?? ""))
    .filter(Boolean);
  if (scIds.length === 0) {
    return { bySeason: [], career: sumPlayerTotals(memberId, []) };
  }

  const raw = await db
    .collection("league_fixtures")
    .find({
      seasonCompetitionId: { $in: scIds },
      published: true,
    })
    .project({
      fixtureId: 1,
      seasonCompetitionId: 1,
      round: 1,
      homeTeamId: 1,
      awayTeamId: 1,
      status: 1,
      result: 1,
      resultStatus: 1,
      matchEvents: 1,
    })
    .toArray();

  const fixturesBySc = new Map<string, typeof raw>();
  for (const f of raw) {
    const id = String(f.seasonCompetitionId ?? "");
    if (!id) continue;
    if (!fixturesBySc.has(id)) fixturesBySc.set(id, []);
    fixturesBySc.get(id)!.push(f);
  }

  const bySeason: SeasonSlice[] = [];
  const slices: PlayerSeasonTotals[] = [];

  for (const sc of scs) {
    const scId = String(sc.seasonCompetitionId ?? "");
    const list = fixturesBySc.get(scId) ?? [];
    const fixtures = list.map((f) => ({
      fixtureId: String(f.fixtureId),
      round: f.round,
      homeTeamId: String(f.homeTeamId ?? ""),
      awayTeamId: String(f.awayTeamId ?? ""),
      status: f.status,
      result: f.result,
      resultStatus: f.resultStatus,
      matchEvents: f.matchEvents,
    }));
    const { totalsByMember } = aggregatePlayerStatsForSeason(
      fixtures,
      Boolean(sc.resultApprovalRequired),
    );
    const t = totalsByMember.get(memberId);
    if (t && hasAnyPlayerStat(t)) {
      bySeason.push({
        seasonCompetitionId: scId,
        season: sc.season,
        competitionId: String(sc.competitionId ?? ""),
        totals: t,
      });
      slices.push(t);
    }
  }

  return {
    bySeason,
    career: sumPlayerTotals(memberId, slices),
  };
}
