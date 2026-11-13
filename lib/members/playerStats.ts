// Games and goals for one member, from match line-ups and fixture events.

type Doc = Record<string, any>;

export interface PlayerStats {
  gamesSeason: number;
  gamesTotal: number;
  goalsSeason: number;
  goalsTotal: number;
  season: number;
}

const SKIP_STATUS = new Set(["cancelled", "canceled", "postponed", "abandoned", "forfeit"]);
const GOAL_KINDS = new Set(["goal", "penalty_stroke_goal"]); // shootout goals are not match goals

/**
 * `lineups` are fixture_lineups docs containing the member; `fixtures` are the matching league_fixtures.
 * A game counts when the member is in the line-up and did not sit out. The season is the calendar
 * year of the fixture's scheduled start. `importedGames` (from the old site) raises the total if larger.
 */
export function computePlayerStats(
  memberId: string,
  lineups: Doc[],
  fixtures: Doc[],
  now: Date,
  importedGames = 0,
  importedGoals = 0,
): PlayerStats {
  const season = now.getFullYear();
  const byId = new Map(fixtures.map((f) => [String(f.fixtureId), f]));
  const counted = new Set<string>();
  let gamesTotal = 0, gamesSeason = 0, goalsTotal = 0, goalsSeason = 0;

  for (const lu of lineups) {
    const fid = String(lu.fixtureId);
    const f = byId.get(fid);
    if (!f || counted.has(fid) || SKIP_STATUS.has(String(f.status ?? "").toLowerCase())) continue;
    const me = (lu.players as Doc[] | undefined)?.find((p) => p.memberId === memberId);
    if (!me || me.didNotPlay) continue;
    counted.add(fid);
    const year = f.scheduledStart ? new Date(f.scheduledStart).getFullYear() : NaN;
    const inSeason = year === season;
    const goals = ((f.matchEvents as Doc[] | undefined) ?? []).filter((e) => e.memberId === memberId && GOAL_KINDS.has(e.kind)).length;
    gamesTotal++; goalsTotal += goals;
    if (inSeason) { gamesSeason++; goalsSeason += goals; }
  }
  return {
    gamesSeason,
    gamesTotal: Math.max(gamesTotal, Number(importedGames) || 0),
    goalsSeason,
    goalsTotal: Math.max(goalsTotal, Number(importedGoals) || 0),
    season,
  };
}

/** True for anyone who is, or has been, a player. */
export function hasPlayerHistory(member: Doc, stats?: Pick<PlayerStats, "gamesTotal"> | null): boolean {
  const roles: unknown[] = [...(member.roles ?? []), ...(member.membership?.roles ?? [])];
  if (roles.some((r) => String(r) === "role-player")) return true;
  if ((stats?.gamesTotal ?? 0) > 0) return true;
  if (Array.isArray(member.teams) && member.teams.length > 0) return true;
  const p = member.playerInfo;
  return !!p && typeof p === "object" && Object.values(p).some((v) => v !== null && v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0));
}
