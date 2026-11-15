// lib/members/playingStats.ts
// A player's own numbers from match line-ups and fixture events: all-time, this season, per team,
// and season by season. Pure function; the route supplies the documents.

type Doc = Record<string, any>;

export interface StatTotals {
  games: number;
  goals: number;
  assists: number;
  goalsPerGame: number;
  starts: number;
  subAppearances: number;
  captainGames: number;
  wins: number;
  draws: number;
  losses: number;
  greenCards: number;
  yellowCards: number;
  redCards: number;
  gkSaves: number;
  mostGoalsInAGame: number;
}
export interface TeamStatRow { teamId: string; team: string; games: number; goals: number; assists: number }
export interface SeasonStatRow { year: number; games: number; goals: number; assists: number }
export interface PlayingStats {
  season: number;
  allTime: StatTotals;
  thisSeason: StatTotals;
  byTeam: TeamStatRow[]; // this season
  bySeason: SeasonStatRow[]; // newest first
}

const SKIP_STATUS = new Set(["cancelled", "canceled", "postponed", "abandoned", "forfeit"]);
const GOAL_KINDS = new Set(["goal", "penalty_stroke_goal"]); // shootout goals are not match goals

const empty = (): StatTotals => ({
  games: 0, goals: 0, assists: 0, goalsPerGame: 0, starts: 0, subAppearances: 0, captainGames: 0,
  wins: 0, draws: 0, losses: 0, greenCards: 0, yellowCards: 0, redCards: 0, gkSaves: 0, mostGoalsInAGame: 0,
});
const rate = (goals: number, games: number) => (games > 0 ? Math.round((goals / games) * 100) / 100 : 0);

function outcome(f: Doc, teamId: string): "w" | "d" | "l" | null {
  const r = f.result as Doc | null | undefined;
  if (!r || String(f.status ?? "").toLowerCase() !== "completed") return null;
  if (r.resultType && r.resultType !== "normal") return null;
  const h = Number(r.homeScore), a = Number(r.awayScore);
  if (!Number.isFinite(h) || !Number.isFinite(a)) return null;
  const mine = String(f.homeTeamId) === teamId ? h : String(f.awayTeamId) === teamId ? a : null;
  if (mine === null) return null;
  const theirs = mine === h ? a : h;
  return mine > theirs ? "w" : mine < theirs ? "l" : "d";
}

export function computePlayingStats(
  memberId: string,
  lineups: Doc[],
  fixtures: Doc[],
  teamNames: Map<string, string>,
  now: Date,
  importedGames = 0,
  importedGoals = 0,
): PlayingStats {
  const season = now.getFullYear();
  const byId = new Map(fixtures.map((f) => [String(f.fixtureId), f]));
  const allTime = empty();
  const thisSeason = empty();
  const teams = new Map<string, TeamStatRow>();
  const seasons = new Map<number, SeasonStatRow>();
  const counted = new Set<string>();

  for (const lu of lineups) {
    const f = byId.get(String(lu.fixtureId));
    if (!f || SKIP_STATUS.has(String(f.status ?? "").toLowerCase())) continue;
    const me = ((lu.players as Doc[] | undefined) ?? []).find((p) => p.memberId === memberId);
    if (!me || me.didNotPlay) continue;
    const key = `${f.fixtureId}|${lu.teamId}`;
    if (counted.has(key)) continue;
    counted.add(key);

    const year = f.scheduledStart ? new Date(f.scheduledStart).getFullYear() : NaN;
    const teamId = String(lu.teamId ?? "");
    const mine = ((f.matchEvents as Doc[] | undefined) ?? []).filter((e) => e.memberId === memberId && (!e.teamId || e.teamId === teamId));
    const goals = mine.filter((e) => GOAL_KINDS.has(e.kind)).length;
    const assists = ((f.matchEvents as Doc[] | undefined) ?? []).filter((e) => e.kind === "goal" && e.assistMemberId === memberId).length;
    const res = outcome(f, teamId);

    const apply = (t: StatTotals) => {
      t.games++; t.goals += goals; t.assists += assists;
      if (me.started) t.starts++; else t.subAppearances++;
      if (me.isCaptain) t.captainGames++;
      if (res === "w") t.wins++; else if (res === "d") t.draws++; else if (res === "l") t.losses++;
      t.greenCards += mine.filter((e) => e.kind === "green_card").length;
      t.yellowCards += mine.filter((e) => e.kind === "yellow_card").length;
      t.redCards += mine.filter((e) => e.kind === "red_card").length;
      t.gkSaves += mine.filter((e) => e.kind === "gk_save").length;
      t.mostGoalsInAGame = Math.max(t.mostGoalsInAGame, goals);
    };
    apply(allTime);

    if (Number.isFinite(year)) {
      const s = seasons.get(year) ?? { year, games: 0, goals: 0, assists: 0 };
      s.games++; s.goals += goals; s.assists += assists;
      seasons.set(year, s);
      if (year === season) {
        apply(thisSeason);
        const t = teams.get(teamId) ?? { teamId, team: teamNames.get(teamId) ?? teamId, games: 0, goals: 0, assists: 0 };
        t.games++; t.goals += goals; t.assists += assists;
        teams.set(teamId, t);
      }
    }
  }

  // Imported history from the old site can only raise the all-time figures.
  allTime.games = Math.max(allTime.games, Number(importedGames) || 0);
  allTime.goals = Math.max(allTime.goals, Number(importedGoals) || 0);
  allTime.goalsPerGame = rate(allTime.goals, allTime.games);
  thisSeason.goalsPerGame = rate(thisSeason.goals, thisSeason.games);

  return {
    season,
    allTime,
    thisSeason,
    byTeam: [...teams.values()].sort((a, b) => b.games - a.games || a.team.localeCompare(b.team)),
    bySeason: [...seasons.values()].sort((a, b) => b.year - a.year),
  };
}
