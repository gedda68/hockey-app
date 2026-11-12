import { describe, expect, it } from "vitest";
import { formatSeasonLabel } from "@/lib/competitions/seasonLabel";

describe("formatSeasonLabel", () => {
  it("shows the year and the grade", () => {
    expect(formatSeasonLabel({ season: "2026", competitionName: "BHL 2" })).toBe("2026 - BHL 2");
    expect(formatSeasonLabel({ season: 2026, competitionName: "BHL1" })).toBe("2026 - BHL1");
  });

  it("does not repeat the year when the display name already has it", () => {
    for (const displayName of ["2026 BHL 2", "2026 - BHL 2", "2026 – BHL 2", "2026: BHL 2", " 2026  BHL 2 "]) {
      expect(formatSeasonLabel({ season: "2026", displayName })).toBe("2026 - BHL 2");
    }
  });

  it("prefers the display name over the competition name", () => {
    expect(
      formatSeasonLabel({ season: "2026", displayName: "BHL Division 2", competitionName: "BHL 2" }),
    ).toBe("2026 - BHL Division 2");
  });

  it("keeps years inside a grade name", () => {
    expect(formatSeasonLabel({ season: "2026", competitionName: "Over 2026 Masters" })).toBe(
      "2026 - Over 2026 Masters",
    );
  });

  it("falls back gracefully when parts are missing", () => {
    expect(formatSeasonLabel({ season: "2026" })).toBe("2026");
    expect(formatSeasonLabel({ competitionName: "BHL 2" })).toBe("BHL 2");
    expect(formatSeasonLabel({})).toBe("");
    expect(formatSeasonLabel({ season: "2026", displayName: "2026" })).toBe("2026");
  });

  it("never includes a status or an id", () => {
    const label = formatSeasonLabel({ season: "2026", competitionName: "BHL 2" });
    expect(label).not.toMatch(/completed|published|sc-|…/);
  });
});
