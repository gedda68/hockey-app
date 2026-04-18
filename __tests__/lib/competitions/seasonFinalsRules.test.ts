import { describe, it, expect } from "vitest";
import { ladderFinalistCount } from "@/lib/competitions/seasonFinalsRules";
import type { FinalsSeriesConfig } from "@/lib/db/schemas/competition.schema";

const defaultFinals: FinalsSeriesConfig = {
  teamCountThreshold: 10,
  qualifierCountBelowThreshold: 4,
  qualifierCountAtOrAboveThreshold: 5,
  seriesFormat: "single_elimination",
};

describe("ladderFinalistCount", () => {
  it("returns 0 for fewer than two teams", () => {
    expect(ladderFinalistCount(0, defaultFinals)).toBe(0);
    expect(ladderFinalistCount(1, defaultFinals)).toBe(0);
  });

  it("uses below-threshold count when team count is strictly below threshold", () => {
    expect(ladderFinalistCount(9, defaultFinals)).toBe(4);
    expect(ladderFinalistCount(2, defaultFinals)).toBe(2);
  });

  it("uses at-or-above count when team count meets threshold", () => {
    expect(ladderFinalistCount(10, defaultFinals)).toBe(5);
    expect(ladderFinalistCount(14, defaultFinals)).toBe(5);
  });

  it("caps at team count", () => {
    expect(ladderFinalistCount(3, { ...defaultFinals, qualifierCountBelowThreshold: 8 })).toBe(3);
  });
});
