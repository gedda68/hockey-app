import { describe, expect, it } from "vitest";
import { computeByes } from "@/lib/competitions/byes";

const f = (round: number, h: string, a: string, extra: object = {}) => ({ round, homeTeamId: h, awayTeamId: a, ...extra });
describe("byes", () => {
  it("finds the team resting each round for an odd number of teams", () => {
    // 5 teams: A B C D E
    const r = computeByes([f(1, "A", "B"), f(1, "C", "D"), f(2, "A", "C"), f(2, "B", "E"), f(3, "D", "E"), f(3, "A", "B")]);
    expect(r).toEqual({ 1: ["E"], 2: ["D"], 3: ["C"] });
  });
  it("has none for an even number of teams, and ignores finals and cancelled matches", () => {
    expect(computeByes([f(1, "A", "B"), f(1, "C", "D"), f(2, "A", "C")])).toEqual({});
    expect(computeByes([f(1, "A", "B"), f(1, "C", "D"), f(1, "E", "A", { status: "cancelled" }), f(9, null as never, null as never, { matchLevel: "finals" })])).toEqual({});
  });
});
