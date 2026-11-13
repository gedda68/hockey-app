// Every season a member had a role in a team: year, team, role(s) and goals scored for that team.
// Built from team rosters (players + staff), match line-ups/events, and legacy `member.teams` rows.

type Doc = Record<string, any>;

export interface TeamHistoryRow {
  year: string;
  team: string;
  roles: string[];
  goals: number;
  games: number;
}

const GOAL_KINDS = new Set(["goal", "penalty_stroke_goal"]); // shootout goals are not match goals
const SKIP_STATUS = new Set(["cancelled", "canceled", "postponed", "abandoned", "forfeit"]);
const norm = (v: unknown) => String(v ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
const yearOf = (v: unknown) => {
  const m = String(v ?? "").match(/(19|20)\d{2}/);
  return m ? m[0] : String(v ?? "").trim();
};
const pretty = (v: string) => v.replace(/^role-/, "").replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export interface TeamHistoryInput {
  memberId: string;
  rosters?: Doc[]; // teamRosters containing the member
  memberTeams?: Doc[]; // legacy member.teams rows
  lineups?: Doc[]; // fixture_lineups containing the member
  fixtures?: Doc[]; // matching league_fixtures (with matchEvents)
  teamNames?: Map<string, string>; // teamId -> name
}

export function buildTeamHistory(input: TeamHistoryInput): TeamHistoryRow[] {
  const { memberId, rosters = [], memberTeams = [], lineups = [], fixtures = [], teamNames = new Map() } = input;
  const rows: TeamHistoryRow[] = [];

  const upsert = (year: string, team: string, roles: string[], goals = 0, games = 0) => {
    if (!year || !team) return;
    const key = norm(team);
    // Same season and a matching/contained team name -> the same team (roster names and fixture names differ a little).
    const hit = rows.find((r) => r.year === year && (norm(r.team) === key || (key.length > 3 && (norm(r.team).includes(key) || key.includes(norm(r.team)))) ));
    if (hit) {
      for (const r of roles) if (!hit.roles.includes(r)) hit.roles.push(r);
      hit.goals += goals;
      hit.games += games;
    } else rows.push({ year, team, roles: [...new Set(roles)], goals, games });
  };

  // 1. Team rosters: player and staff positions
  for (const r of rosters) {
    const year = yearOf(r.season);
    for (const t of (r.teams as Doc[] | undefined) ?? []) {
      const roles: string[] = [];
      const p = ((t.players as Doc[] | undefined) ?? []).find((x) => [x.id, x.playerId, x.memberId].includes(memberId));
      if (p) {
        roles.push(/goal/i.test(String(p.position ?? "")) ? "Goalkeeper" : "Player");
        if (p.leadership?.captain) roles.push("Captain");
        if (p.leadership?.viceCaptain) roles.push("Vice Captain");
      }
      if (t.coach?.memberId === memberId) roles.push("Coach");
      if (t.assistantCoach?.memberId === memberId) roles.push("Assistant Coach");
      if (t.manager?.memberId === memberId) roles.push("Manager");
      for (const s of (t.staff as Doc[] | undefined) ?? []) if (s.memberId === memberId && s.role) roles.push(String(s.role));
      if (roles.length) upsert(year, String(t.name ?? r.division ?? "Team"), roles);
    }
  }

  // 2. Legacy rows on the member itself
  for (const t of memberTeams) {
    const year = yearOf(t.season ?? t.seasonYear);
    const team = String(t.teamName ?? t.name ?? t.teamId ?? "");
    upsert(year, team, [t.role ? pretty(String(t.role)) : "Player"]);
  }

  // 3. Match line-ups: games and goals for that team
  const byId = new Map(fixtures.map((f) => [String(f.fixtureId), f]));
  const counted = new Set<string>();
  for (const lu of lineups) {
    const f = byId.get(String(lu.fixtureId));
    if (!f || SKIP_STATUS.has(String(f.status ?? "").toLowerCase())) continue;
    const year = f.scheduledStart ? String(new Date(f.scheduledStart).getFullYear()) : "";
    const team = teamNames.get(String(lu.teamId)) ?? String(lu.teamId ?? "");
    const me = ((lu.players as Doc[] | undefined) ?? []).find((p) => p.memberId === memberId);
    const staff = ((lu.staff as Doc[] | undefined) ?? []).find((s) => s.memberId === memberId);
    if (staff) upsert(year, team, [pretty(String(staff.role))]);
    if (!me || me.didNotPlay) continue;
    const key = `${f.fixtureId}|${lu.teamId}`;
    if (counted.has(key)) continue;
    counted.add(key);
    const goals = ((f.matchEvents as Doc[] | undefined) ?? []).filter(
      (e) => e.memberId === memberId && GOAL_KINDS.has(e.kind) && (!e.teamId || e.teamId === lu.teamId),
    ).length;
    upsert(year, team, [me.isGoalkeeper ? "Goalkeeper" : "Player"], goals, 1);
  }

  return rows.sort((a, b) => b.year.localeCompare(a.year) || a.team.localeCompare(b.team));
}
