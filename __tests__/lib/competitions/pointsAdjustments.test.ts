import { describe, expect, it } from "vitest";
import { applyPointsAdjustments } from "@/lib/competitions/pointsAdjustments";

const row = (teamId: string, pts: number) => ({ teamId, p: 1, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts });
const adj = (teamId: string, points: number) => ({ adjustmentId: `a${points}`, teamId, points, reason: "r", createdAt: "", createdBy: "u" });

describe("applyPointsAdjustments", () => {
  it("adds and deducts points, stacking multiple adjustments", () => {
    const m = new Map([["a", row("a", 10)], ["b", row("b", 8)]]);
    applyPointsAdjustments(m, [adj("a", -3), adj("a", 1), adj("b", 2)]);
    expect(m.get("a")!.pts).toBe(8);
    expect(m.get("b")!.pts).toBe(10);
  });
  it("creates a row for a team with no counted results", () => {
    const m = new Map<string, ReturnType<typeof row>>();
    applyPointsAdjustments(m, [adj("z", -2)]);
    expect(m.get("z")).toMatchObject({ p: 0, pts: -2 });
  });
  it("ignores missing/garbage input", () => {
    const m = new Map([["a", row("a", 5)]]);
    applyPointsAdjustments(m, undefined);
    applyPointsAdjustments(m, [{ ...adj("a", 0), points: Number.NaN }]);
    expect(m.get("a")!.pts).toBe(5);
  });
});
