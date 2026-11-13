import { describe, expect, it } from "vitest";
import { buildShootoutAttempts, hasShootout } from "@/lib/competitions/shootout";

const ev = (kind: string, teamId: string, memberId: string, gk?: string) =>
  ({ eventId: memberId, kind, teamId, memberId, goalkeeperMemberId: gk }) as never;

describe("shootout", () => {
  it("numbers attempts per team in recorded order and marks goals", () => {
    const a = buildShootoutAttempts([
      ev("goal", "H", "x"),
      ev("shootout_goal", "H", "h1", "ga"),
      ev("shootout_miss", "A", "a1", "gh"),
      ev("shootout_goal", "H", "h2", "ga"),
    ]);
    expect(a.map((x) => [x.teamId, x.round, x.scored, x.goalkeeperId])).toEqual([
      ["H", 1, true, "ga"],
      ["A", 1, false, "gh"],
      ["H", 2, true, "ga"],
    ]);
  });
  it("only reports a shootout when there is a score or attempts", () => {
    expect(hasShootout({})).toBe(false);
    expect(hasShootout({ matchEvents: [ev("goal", "H", "x")] })).toBe(false);
    expect(hasShootout({ homeShootOutScore: 6, awayShootOutScore: 5 })).toBe(true);
    expect(hasShootout({ matchEvents: [ev("shootout_miss", "A", "a1")] })).toBe(true);
    expect(hasShootout({ homeShootOutScore: 0, awayShootOutScore: 0 })).toBe(true);
  });
});
