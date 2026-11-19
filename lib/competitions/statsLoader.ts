// lib/competitions/statsLoader.ts — loads what the Statistics page needs for a year (and optionally one division).
import type { Db } from "mongodb";
import { memberDisplayName } from "./playerSeasonStats";
import type { StatsFixture } from "./statsOverview";

export async function loadStatsScope(db: Db, seasonCompetitionIds: string[]) {
  const scs = seasonCompetitionIds.length
    ? await db.collection("season_competitions").find({ seasonCompetitionId: { $in: seasonCompetitionIds } }).project({ seasonCompetitionId: 1, resultApprovalRequired: 1 }).toArray()
    : [];
  const approvalBySc = new Map(scs.map((s) => [String(s.seasonCompetitionId), Boolean(s.resultApprovalRequired)]));
  const raw = seasonCompetitionIds.length
    ? await db.collection("league_fixtures").find({ seasonCompetitionId: { $in: seasonCompetitionIds }, published: true, homeTeamId: { $ne: null }, awayTeamId: { $ne: null } })
        .project({ fixtureId: 1, seasonCompetitionId: 1, round: 1, homeTeamId: 1, awayTeamId: 1, status: 1, result: 1, resultStatus: 1, matchEvents: 1 }).toArray()
    : [];
  const fixtures: StatsFixture[] = raw.map((f) => ({
    fixtureId: String(f.fixtureId), seasonCompetitionId: String(f.seasonCompetitionId), round: f.round,
    homeTeamId: String(f.homeTeamId ?? ""), awayTeamId: String(f.awayTeamId ?? ""), status: f.status, result: f.result ?? null, resultStatus: f.resultStatus, matchEvents: f.matchEvents,
  }));

  const teamIds = [...new Set(fixtures.flatMap((f) => [f.homeTeamId, f.awayTeamId]).filter(Boolean))];
  const teams = teamIds.length ? await db.collection("teams").find({ teamId: { $in: teamIds } }).project({ teamId: 1, name: 1, clubId: 1 }).toArray() : [];
  const teamName = new Map<string, string>(); const clubByTeam = new Map<string, string>();
  for (const t of teams) { const id = String(t.teamId); teamName.set(id, String(t.name ?? id)); if (t.clubId) clubByTeam.set(id, String(t.clubId)); }
  const clubIds = [...new Set(clubByTeam.values())];
  const clubs = clubIds.length ? await db.collection("clubs").find({ id: { $in: clubIds } }).project({ id: 1, name: 1, shortName: 1 }).toArray() : [];
  const clubName = new Map<string, string>(clubs.map((c) => [String(c.id), String(c.name ?? c.shortName ?? c.id)]));
  return { fixtures, approvalBySc, clubByTeam, teamName, clubName };
}

export async function loadMemberNames(db: Db, memberIds: string[]) {
  const docs = memberIds.length ? await db.collection("members").find({ memberId: { $in: memberIds } }).project({ memberId: 1, personalInfo: 1 }).toArray() : [];
  return new Map<string, string>(docs.map((m) => [String(m.memberId), memberDisplayName(m) || String(m.memberId)]));
}
