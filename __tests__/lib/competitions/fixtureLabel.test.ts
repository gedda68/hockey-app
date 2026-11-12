import { describe, expect, it } from "vitest";
import { formatFixtureLabel } from "@/lib/competitions/fixtureLabel";

describe("formatFixtureLabel", () => {
  it("shows round and teams", () => {
    expect(formatFixtureLabel({ round: 1, homeName: "Redcliffe", awayName: "Bulimba" })).toBe("Round 1 - Redcliffe v Bulimba");
  });
  it("falls back to the id when team names are unknown", () => {
    expect(formatFixtureLabel({ round: 2, homeName: "A", fixtureId: "fx-9" })).toBe("Round 2 - fx-9");
  });
  it("handles a missing round", () => {
    expect(formatFixtureLabel({ round: 0, homeName: "A", awayName: "B" })).toBe("Round - - A v B");
  });
});
