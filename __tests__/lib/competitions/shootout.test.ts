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

import { draftsFromEvents, mergeShootoutEvents, shootoutTotals } from "@/lib/competitions/shootout";

describe("shootout admin helpers", () => {
  const events = [
    { eventId: "g1", kind: "goal", teamId: "H", memberId: "x" },
    { eventId: "s1", kind: "shootout_goal", teamId: "H", memberId: "h1", goalkeeperMemberId: "ga" },
    { eventId: "s2", kind: "shootout_miss", teamId: "A", memberId: "a1", goalkeeperMemberId: "gh" },
  ] as never[];
  it("round-trips drafts and totals the goals", () => {
    const d = draftsFromEvents(events);
    expect(d).toHaveLength(2);
    expect(shootoutTotals(d, "H", "A")).toEqual({ home: 1, away: 0 });
  });
  it("keeps non-shootout events untouched when merging", () => {
    const d = [{ teamId: "A", shooterId: "a9", goalkeeperId: "", scored: true }];
    const out = mergeShootoutEvents(events as never, d);
    expect(out[0]).toMatchObject({ eventId: "g1", kind: "goal" });
    expect(out).toHaveLength(2);
    expect(out[1]).toMatchObject({ kind: "shootout_goal", teamId: "A", memberId: "a9", goalkeeperMemberId: null });
  });
});
