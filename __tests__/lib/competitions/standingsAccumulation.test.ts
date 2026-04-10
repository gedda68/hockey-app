import { describe, expect, it } from "vitest";
import { accumulateStandingsRowsFromFixtures } from "@/lib/competitions/standings";

describe("accumulateStandingsRowsFromFixtures", () => {
  it("counts a normal home win when approval not required and match completed", () => {
    const fixtures = [
      {
        homeTeamId: "t1",
        awayTeamId: "t2",
        status: "completed",
        resultStatus: "submitted",
        result: { resultType: "normal", homeScore: 3, awayScore: 1 },
      },
    ];
    const map = accumulateStandingsRowsFromFixtures(
      fixtures,
      {},
      false,
    );
    expect(map.get("t1")).toMatchObject({ p: 1, w: 1, gf: 3, ga: 1, pts: 3 });
    expect(map.get("t2")).toMatchObject({ p: 1, l: 1, gf: 1, ga: 3, pts: 0 });
  });

  it("ignores fixtures until results are approved when association requires approval", () => {
    const fixtures = [
      {
        homeTeamId: "t1",
        awayTeamId: "t2",
        status: "completed",
        resultStatus: "submitted",
        result: { resultType: "normal", homeScore: 1, awayScore: 0 },
      },
    ];
    const map = accumulateStandingsRowsFromFixtures(fixtures, {}, true);
    expect(map.get("t1")).toMatchObject({ p: 0 });
    expect(map.get("t2")).toMatchObject({ p: 0 });
  });

  it("counts approved results when approval is required", () => {
    const fixtures = [
      {
        homeTeamId: "t1",
        awayTeamId: "t2",
        status: "scheduled",
        resultStatus: "approved",
        result: { resultType: "normal", homeScore: 2, awayScore: 2 },
      },
    ];
    const map = accumulateStandingsRowsFromFixtures(fixtures, {}, true);
    expect(map.get("t1")?.d).toBe(1);
    expect(map.get("t2")?.d).toBe(1);
  });
});
