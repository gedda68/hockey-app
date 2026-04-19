import { describe, expect, it } from "vitest";
import { assertDivisionBelongsToSeason, seasonDivisionIds } from "@/lib/competitions/teamLeagueContext";

describe("teamLeagueContext", () => {
  it("seasonDivisionIds reads divisionId from objects", () => {
    expect(seasonDivisionIds([{ divisionId: "d1" }, { foo: 1 }])).toEqual([
      { divisionId: "d1" },
    ]);
  });

  it("assertDivisionBelongsToSeason accepts empty division id", () => {
    expect(
      assertDivisionBelongsToSeason({
        seasonCompetitionId: "sc1",
        divisions: [{ divisionId: "a" }],
        competitionDivisionId: null,
      }),
    ).toEqual({ ok: true });
  });

  it("assertDivisionBelongsToSeason rejects unknown id", () => {
    const r = assertDivisionBelongsToSeason({
      seasonCompetitionId: "sc1",
      divisions: [{ divisionId: "a" }],
      competitionDivisionId: "nope",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("not defined");
  });
});
