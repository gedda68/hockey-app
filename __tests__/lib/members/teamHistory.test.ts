import { describe, it, expect } from "vitest";
import { buildTeamHistory } from "@/lib/members/teamHistory";

const roster = (season: string, teams: any[]) => ({ season, teams });

describe("buildTeamHistory", () => {
  it("lists each season and team with roles from rosters", () => {
    const rows = buildTeamHistory({
      memberId: "m1",
      rosters: [
        roster("2025", [{ name: "CHC Men 1", players: [{ id: "m1", position: "Forward", leadership: { captain: true } }] }]),
        roster("2026", [{ name: "CHC Men 2", players: [], coach: { memberId: "m1" }, manager: { memberId: "m1" } }]),
      ],
    });
    expect(rows).toEqual([
      { year: "2026", team: "CHC Men 2", roles: ["Coach", "Manager"], goals: 0, games: 0 },
      { year: "2025", team: "CHC Men 1", roles: ["Player", "Captain"], goals: 0, games: 0 },
    ]);
  });

  it("adds games and goals for that team from line-ups, merging with the roster row", () => {
    const rows = buildTeamHistory({
      memberId: "m1",
      rosters: [roster("2026", [{ name: "Commercial Men 1", players: [{ id: "m1" }] }])],
      lineups: [
        { fixtureId: "f1", teamId: "t1", players: [{ memberId: "m1" }] },
        { fixtureId: "f2", teamId: "t1", players: [{ memberId: "m1" }] },
        { fixtureId: "f3", teamId: "t9", players: [{ memberId: "m1", didNotPlay: true }] },
      ],
      fixtures: [
        { fixtureId: "f1", scheduledStart: "2026-05-01T00:00:00Z", status: "completed", matchEvents: [{ kind: "goal", memberId: "m1", teamId: "t1" }, { kind: "shootout_goal", memberId: "m1", teamId: "t1" }, { kind: "goal", memberId: "m1", teamId: "other" }] },
        { fixtureId: "f2", scheduledStart: "2026-05-08T00:00:00Z", status: "completed", matchEvents: [{ kind: "penalty_stroke_goal", memberId: "m1", teamId: "t1" }] },
        { fixtureId: "f3", scheduledStart: "2026-05-15T00:00:00Z", status: "completed", matchEvents: [] },
      ],
      teamNames: new Map([["t1", "Commercial Men 1"]]),
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ year: "2026", team: "Commercial Men 1", goals: 2, games: 2 });
  });

  it("keeps different teams in the same year separate and handles legacy rows and staff", () => {
    const rows = buildTeamHistory({
      memberId: "m1",
      memberTeams: [{ teamName: "Old Team", season: "2019", role: "role-player" }],
      lineups: [{ fixtureId: "f1", teamId: "t1", players: [], staff: [{ memberId: "m1", role: "Coach" }] }],
      fixtures: [{ fixtureId: "f1", scheduledStart: "2026-05-01T00:00:00Z", status: "completed" }],
      teamNames: new Map([["t1", "Reds"]]),
    });
    expect(rows.map((r) => [r.year, r.team, r.roles])).toEqual([["2026", "Reds", ["Coach"]], ["2019", "Old Team", ["Player"]]]);
  });
});
