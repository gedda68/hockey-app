import { describe, it, expect } from "vitest";
import { computePlayingStats } from "@/lib/members/playingStats";

const now = new Date("2026-11-15T00:00:00Z");
const names = new Map([["t1", "Open Men 1"], ["t2", "Masters"]]);
const lu = (fixtureId: string, teamId: string, extra = {}) => ({ fixtureId, teamId, players: [{ memberId: "m1", started: true, didNotPlay: false, ...extra }] });
const fx = (fixtureId: string, start: string, homeTeamId: string, hs: number, as: number, events: Record<string, unknown>[] = []) => ({
  fixtureId, scheduledStart: start, status: "completed", homeTeamId, awayTeamId: "x", result: { homeScore: hs, awayScore: as }, matchEvents: events,
});
const g = (kind = "goal", extra = {}) => ({ kind, memberId: "m1", teamId: "t1", ...extra });

describe("computePlayingStats", () => {
  const lineups = [lu("a", "t1", { isCaptain: true }), lu("b", "t1", { started: false }), lu("c", "t2"), lu("d", "t1")];
  const fixtures = [
    fx("a", "2026-04-01T00:00:00Z", "t1", 3, 1, [g(), g(), g("shootout_goal"), { kind: "goal", memberId: "o", teamId: "t1", assistMemberId: "m1" }]),
    fx("b", "2026-05-01T00:00:00Z", "t1", 1, 1, [g("green_card")]),
    fx("c", "2026-06-01T00:00:00Z", "t2", 0, 2, [{ kind: "goal", memberId: "m1", teamId: "t2" }]),
    fx("d", "2025-06-01T00:00:00Z", "t1", 2, 0, [g()]),
  ];
  const s = computePlayingStats("m1", lineups, fixtures, names, now);

  it("totals all-time and this season", () => {
    expect(s.allTime).toMatchObject({ games: 4, goals: 4, assists: 1, starts: 3, subAppearances: 1, captainGames: 1, wins: 2, draws: 1, losses: 1, greenCards: 1, mostGoalsInAGame: 2 });
    expect(s.thisSeason).toMatchObject({ games: 3, goals: 3 });
    expect(s.thisSeason.goalsPerGame).toBe(1);
  });
  it("breaks this season down by team", () => {
    expect(s.byTeam).toEqual([
      { teamId: "t1", team: "Open Men 1", games: 2, goals: 2, assists: 1 },
      { teamId: "t2", team: "Masters", games: 1, goals: 1, assists: 0 },
    ]);
  });
  it("lists seasons newest first", () => {
    expect(s.bySeason.map((r) => r.year)).toEqual([2026, 2025]);
  });
  it("uses imported totals when larger, and skips cancelled games", () => {
    const r = computePlayingStats("m1", [lu("a", "t1")], [{ ...fixtures[0], status: "cancelled" }], names, now, 50, 12);
    expect(r.allTime).toMatchObject({ games: 50, goals: 12 });
    expect(r.thisSeason.games).toBe(0);
  });
});
