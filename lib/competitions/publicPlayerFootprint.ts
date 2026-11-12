// lib/competitions/publicPlayerFootprint.ts
// Where does a member appear in *publicly visible* competition results?
//
// This is the single rule for "is this person publicly findable": a member is only
// visible if they have at least one counted stat in a published fixture of a public
// season competition. It reuses aggregatePlayerStatsForSeason, so it can never
// disagree with the public stats leaderboard / career endpoint about who is visible
// (including the "approved results only" rule for competitions that require it).

import type { Db } from "mongodb";
import {
  aggregatePlayerStatsForSeason,
  hasAnyPlayerStat,
} from "@/lib/competitions/playerSeasonStats";

export const PUBLIC_SC_STATUSES = ["published", "in_progress", "completed"] as const;

export type FootprintFixture = {
  fixtureId: string;
  round: unknown;
  seasonCompetitionId: string;
  homeTeamId: string;
  awayTeamId: string;
  status?: unknown;
  result?: unknown;
  resultStatus?: unknown;
  matchEvents?: unknown;
};

export type FootprintSeasonCompetition = {
  seasonCompetitionId: string;
  season: string;
  competitionId: string;
  owningAssociationId: string;
  resultApprovalRequired: boolean;
};

export type PlayerFootprint = {
  memberId: string;
  /** Teams the member recorded a counted stat for. */
  teamIds: string[];
  /** Public season competitions with at least one counted stat (newest season first). */
  seasonCompetitions: FootprintSeasonCompetition[];
};

/** Pure core: given public season competitions + their published fixtures, who appears where. */
export function buildFootprints(
  seasonCompetitions: FootprintSeasonCompetition[],
  fixtures: FootprintFixture[],
  memberIds: ReadonlySet<string>,
): Map<string, PlayerFootprint> {
  const fixturesBySc = new Map<string, FootprintFixture[]>();
  for (const f of fixtures) {
    const list = fixturesBySc.get(f.seasonCompetitionId) ?? [];
    list.push(f);
    fixturesBySc.set(f.seasonCompetitionId, list);
  }

  const teamIdsByMember = new Map<string, Set<string>>();
  const scsByMember = new Map<string, FootprintSeasonCompetition[]>();

  for (const sc of seasonCompetitions) {
    const list = fixturesBySc.get(sc.seasonCompetitionId);
    if (!list || list.length === 0) continue;

    const { totalsByMember, fixturesByMember } = aggregatePlayerStatsForSeason(
      list,
      sc.resultApprovalRequired,
    );

    for (const memberId of memberIds) {
      const totals = totalsByMember.get(memberId);
      if (!totals || !hasAnyPlayerStat(totals)) continue;

      const scList = scsByMember.get(memberId) ?? [];
      scList.push(sc);
      scsByMember.set(memberId, scList);

      const teams = teamIdsByMember.get(memberId) ?? new Set<string>();
      for (const row of fixturesByMember.get(memberId) ?? []) teams.add(row.teamId);
      teamIdsByMember.set(memberId, teams);
    }
  }

  const out = new Map<string, PlayerFootprint>();
  for (const [memberId, scList] of scsByMember) {
    out.set(memberId, {
      memberId,
      teamIds: [...(teamIdsByMember.get(memberId) ?? [])].sort(),
      seasonCompetitions: [...scList].sort(
        (a, b) =>
          b.season.localeCompare(a.season) ||
          a.seasonCompetitionId.localeCompare(b.seasonCompetitionId),
      ),
    });
  }
  return out;
}

/** DB wrapper. Only pulls the events that involve the requested members. */
export async function findPublicPlayerFootprints(
  db: Db,
  memberIds: string[],
): Promise<Map<string, PlayerFootprint>> {
  const ids = [...new Set(memberIds.map((m) => String(m).trim()).filter(Boolean))];
  if (ids.length === 0) return new Map();

  const rawFixtures = await db
    .collection("league_fixtures")
    .aggregate([
      {
        $match: {
          published: true,
          $or: [
            { "matchEvents.memberId": { $in: ids } },
            { "matchEvents.assistMemberId": { $in: ids } },
          ],
        },
      },
      {
        $project: {
          fixtureId: 1,
          round: 1,
          seasonCompetitionId: 1,
          homeTeamId: 1,
          awayTeamId: 1,
          status: 1,
          result: 1,
          resultStatus: 1,
          // Trim events down to the ones that involve the requested members.
          matchEvents: {
            $filter: {
              input: { $ifNull: ["$matchEvents", []] },
              as: "e",
              cond: {
                $or: [
                  { $in: ["$$e.memberId", { $literal: ids }] },
                  { $in: ["$$e.assistMemberId", { $literal: ids }] },
                ],
              },
            },
          },
        },
      },
    ])
    .toArray();

  const scIds = [
    ...new Set(rawFixtures.map((f) => String(f.seasonCompetitionId ?? "")).filter(Boolean)),
  ];
  if (scIds.length === 0) return new Map();

  const scDocs = await db
    .collection("season_competitions")
    .find({
      seasonCompetitionId: { $in: scIds },
      status: { $in: [...PUBLIC_SC_STATUSES] },
    })
    .project({
      seasonCompetitionId: 1,
      season: 1,
      competitionId: 1,
      owningAssociationId: 1,
      resultApprovalRequired: 1,
    })
    .toArray();

  const seasonCompetitions: FootprintSeasonCompetition[] = scDocs.map((s) => ({
    seasonCompetitionId: String(s.seasonCompetitionId ?? ""),
    season: String(s.season ?? ""),
    competitionId: String(s.competitionId ?? ""),
    owningAssociationId: String(s.owningAssociationId ?? ""),
    resultApprovalRequired: Boolean(s.resultApprovalRequired),
  }));

  const fixtures: FootprintFixture[] = rawFixtures.map((f) => ({
    fixtureId: String(f.fixtureId ?? ""),
    round: f.round,
    seasonCompetitionId: String(f.seasonCompetitionId ?? ""),
    homeTeamId: String(f.homeTeamId ?? ""),
    awayTeamId: String(f.awayTeamId ?? ""),
    status: f.status,
    result: f.result,
    resultStatus: f.resultStatus,
    matchEvents: f.matchEvents,
  }));

  return buildFootprints(seasonCompetitions, fixtures, new Set(ids));
}
