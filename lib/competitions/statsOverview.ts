// lib/competitions/statsOverview.ts — real statistics for the public Statistics page, from published fixtures.
// Pure: give it fixtures (with results and match events) plus the club behind each team.
import { aggregatePlayerStatsForSeason, hasAnyPlayerStat, isFixtureResultPublicForEvents } from "./playerSeasonStats";

export type StatsFixture = {
  fixtureId: string;
  seasonCompetitionId: string;
  round?: unknown;
  homeTeamId: string;
  awayTeamId: string;
  status?: unknown;
  result?: { resultType?: string; homeScore?: number | null; awayScore?: number | null } | null;
  resultStatus?: unknown;
  matchEvents?: unknown;
};

export type StatsFilter = { clubId?: string; memberId?: string };

export type PlayerRow = { memberId: string; teamId: string; clubId: string; matches: number; goals: number; assists: number; gkSaves: number; green: number; yellow: number; red: number };
export type TeamRow = { teamId: string; played: number; wins: number; draws: number; losses: number; gf: number; ga: number; cleanSheets: number };
export type StatsSummary = { matches: number; goals: number; avgGoals: number; cleanSheets: number; green: number; yellow: number; red: number };

const scored = (f: StatsFixture) => {
  const r = f.result;
  if (!r || typeof r.homeScore !== "number" || typeof r.awayScore !== "number") return null;
  if (/forfeit|abandon/i.test(String(r.resultType ?? ""))) return null;
  return { h: r.homeScore, a: r.awayScore };
};

export function computeStats(
  fixtures: StatsFixture[],
  clubByTeam: Map<string, string>,
  approvalBySc: Map<string, boolean>,
  filter: StatsFilter = {},
) {
  const visible = fixtures.filter((f) => f.homeTeamId && f.awayTeamId && isFixtureResultPublicForEvents(f, approvalBySc.get(f.seasonCompetitionId) ?? false));
  const inClub = (f: StatsFixture) => !filter.clubId || clubByTeam.get(f.homeTeamId) === filter.clubId || clubByTeam.get(f.awayTeamId) === filter.clubId;
  const scoped = visible.filter(inClub);

  // Teams: only the club's own teams when a club is picked.
  const teams = new Map<string, TeamRow>();
  const team = (id: string) => { let t = teams.get(id); if (!t) teams.set(id, (t = { teamId: id, played: 0, wins: 0, draws: 0, losses: 0, gf: 0, ga: 0, cleanSheets: 0 })); return t; };
  const summary: StatsSummary = { matches: 0, goals: 0, avgGoals: 0, cleanSheets: 0, green: 0, yellow: 0, red: 0 };
  for (const f of scoped) {
    const s = scored(f);
    if (!s) continue;
    summary.matches += 1; summary.goals += s.h + s.a;
    if (s.h === 0) summary.cleanSheets += 1;
    if (s.a === 0) summary.cleanSheets += 1;
    for (const [id, gf, ga] of [[f.homeTeamId, s.h, s.a], [f.awayTeamId, s.a, s.h]] as const) {
      if (filter.clubId && clubByTeam.get(id) !== filter.clubId) continue;
      const t = team(id);
      t.played += 1; t.gf += gf; t.ga += ga;
      if (gf > ga) t.wins += 1; else if (gf < ga) t.losses += 1; else t.draws += 1;
      if (ga === 0) t.cleanSheets += 1;
    }
  }
  summary.avgGoals = summary.matches ? Math.round((summary.goals / summary.matches) * 100) / 100 : 0;

  // Players: grouped per season competition so each ladder's approval rule applies.
  const bySc = new Map<string, StatsFixture[]>();
  for (const f of scoped) (bySc.get(f.seasonCompetitionId) ?? bySc.set(f.seasonCompetitionId, []).get(f.seasonCompetitionId)!).push(f);
  const players = new Map<string, PlayerRow>();
  for (const [sc, fx] of bySc) {
    const { totalsByMember, fixturesByMember } = aggregatePlayerStatsForSeason(
      fx.map((f) => ({ fixtureId: f.fixtureId, round: f.round, homeTeamId: f.homeTeamId, awayTeamId: f.awayTeamId, status: f.status, result: f.result, resultStatus: f.resultStatus, matchEvents: f.matchEvents })),
      approvalBySc.get(sc) ?? false,
    );
    for (const t of totalsByMember.values()) {
      if (!hasAnyPlayerStat(t)) continue;
      const teamId = fixturesByMember.get(t.memberId)?.[0]?.teamId ?? "";
      const clubId = clubByTeam.get(teamId) ?? "";
      if (filter.clubId && clubId !== filter.clubId) continue;
      const p = players.get(t.memberId) ?? { memberId: t.memberId, teamId, clubId, matches: 0, goals: 0, assists: 0, gkSaves: 0, green: 0, yellow: 0, red: 0 };
      p.matches += t.matchesWithEvents; p.goals += t.goals; p.assists += t.assists; p.gkSaves += t.gkSaves;
      p.green += t.greenCards; p.yellow += t.yellowCards; p.red += t.redCards;
      players.set(t.memberId, p);
      summary.green += t.greenCards; summary.yellow += t.yellowCards; summary.red += t.redCards;
    }
  }
  const all = [...players.values()];
  return {
    summary,
    teams: [...teams.values()].sort((a, b) => b.gf - b.ga - (a.gf - a.ga) || b.gf - a.gf),
    players: filter.memberId ? all.filter((p) => p.memberId === filter.memberId) : all,
    playerChoices: all,
  };
}
