import { describe, it, expect } from "vitest";
import { computePlayerStats, hasPlayerHistory } from "@/lib/members/playerStats";

const now = new Date("2026-11-13T00:00:00Z");
const lu = (fixtureId: string, extra = {}) => ({ fixtureId, players: [{ memberId: "m1", didNotPlay: false, ...extra }] });
const fx = (fixtureId: string, scheduledStart: string, goals: string[] = [], status = "completed") => ({
  fixtureId, scheduledStart, status,
  matchEvents: goals.map((kind) => ({ kind, memberId: "m1" })).concat([{ kind: "goal", memberId: "other" }]),
});

describe("computePlayerStats", () => {
  it("splits this season from total and counts only match goals", () => {
    const s = computePlayerStats("m1", [lu("a"), lu("b"), lu("c")], [
      fx("a", "2026-05-01T00:00:00Z", ["goal", "goal", "shootout_goal"]),
      fx("b", "2026-06-01T00:00:00Z", ["penalty_stroke_goal"]),
      fx("c", "2025-06-01T00:00:00Z", ["goal"]),
    ], now);
    expect(s).toMatchObject({ gamesSeason: 2, gamesTotal: 3, goalsSeason: 3, goalsTotal: 4, season: 2026 });
  });
  it("ignores unused squad members and cancelled fixtures", () => {
    const s = computePlayerStats("m1", [lu("a", { didNotPlay: true }), lu("b")], [fx("a", "2026-05-01T00:00:00Z"), fx("b", "2026-05-02T00:00:00Z", ["goal"], "cancelled")], now);
    expect(s.gamesTotal).toBe(0);
  });
  it("uses imported totals when larger", () => {
    expect(computePlayerStats("m1", [], [], now, 21, 5)).toMatchObject({ gamesTotal: 21, goalsTotal: 5, gamesSeason: 0 });
  });
});

describe("hasPlayerHistory", () => {
  it("true for player role, teams, stats or playerInfo", () => {
    expect(hasPlayerHistory({ roles: ["role-player"] })).toBe(true);
    expect(hasPlayerHistory({ teams: [{ teamId: "t" }] })).toBe(true);
    expect(hasPlayerHistory({}, { gamesTotal: 3 })).toBe(true);
    expect(hasPlayerHistory({ playerInfo: { appearances: 4 } })).toBe(true);
  });
  it("false for a non-player", () => {
    expect(hasPlayerHistory({ roles: ["role-coach"], playerInfo: {} })).toBe(false);
  });
});
