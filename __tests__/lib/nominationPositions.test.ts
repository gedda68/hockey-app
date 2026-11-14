import { describe, it, expect } from "vitest";
import { evaluatePositions, staffMinAge, parseAgeGroup, nominationPosition } from "@/lib/nominations/positions";

const allowed = (v: ReturnType<typeof evaluatePositions>) => v.filter((x) => x.allowed).map((x) => x.position);

describe("staffMinAge", () => {
  it("follows the club table", () => {
    expect(staffMinAge("Under 12")).toBe(16);
    expect(staffMinAge("U14")).toBe(18);
    expect(staffMinAge("Under 18")).toBe(20);
    expect(staffMinAge("Under 21")).toBe(25);
    expect(staffMinAge("Open")).toBe(29);
    expect(staffMinAge("Masters 40")).toBe(29);
  });
  it("parses age groups and returns null for unknown", () => {
    expect(parseAgeGroup("U16")).toEqual({ kind: "junior", size: 16 });
    expect(staffMinAge("Social")).toBeNull();
  });
});

describe("evaluatePositions", () => {
  const season = 2026;
  it("a coach-only member cannot nominate as a player but can as staff when old enough", () => {
    const v = evaluatePositions({ dateOfBirth: "1990-01-01", roles: ["role-coach"] }, "Under 18", season);
    expect(allowed(v)).toEqual(["head_coach", "assistant_coach", "manager", "selector"]);
    expect(v.find((x) => x.position === "player")?.allowed).toBe(false);
  });

  it("a player can nominate for any position they are old enough for", () => {
    const v = evaluatePositions({ dateOfBirth: "1990-01-01", roles: ["role-player"] }, "Under 12", season);
    expect(allowed(v)).toContain("player");
    expect(allowed(v)).toContain("head_coach");
  });

  it("enforces the minimum age for staff roles (U12 needs 16)", () => {
    const young = evaluatePositions({ dateOfBirth: "2012-05-05", roles: ["role-player"] }, "Under 12", season); // 14
    expect(allowed(young)).toEqual(["player"]);
    expect(young.find((x) => x.position === "head_coach")?.reason).toMatch(/at least 16/);
    const ok = evaluatePositions({ dateOfBirth: "2010-05-05", roles: ["role-player"] }, "Under 12", season); // 16
    expect(allowed(ok)).toContain("manager");
  });

  it("open requires over 28", () => {
    expect(allowed(evaluatePositions({ dateOfBirth: "1998-01-01", roles: ["role-coach"] }, "Open", season))).toEqual([]); // 28
    expect(allowed(evaluatePositions({ dateOfBirth: "1997-01-01", roles: ["role-coach"] }, "Open", season))).toContain("head_coach"); // 29
  });

  it("can't be player and staff in the same age group; blocks duplicates", () => {
    const m = { dateOfBirth: "1990-01-01", roles: ["role-player"] };
    const v = evaluatePositions(m, "Under 18", season, [{ ageGroup: "Under 18", position: "player" }]);
    expect(v.find((x) => x.position === "player")?.alreadyNominated).toBe(true);
    expect(allowed(v)).toEqual([]);
    const w = evaluatePositions(m, "Under 18", season, [{ ageGroup: "Under 16", position: "player" }]);
    expect(allowed(w)).toContain("manager"); // different age group is fine
  });

  it("members with no roles cannot nominate for anything", () => {
    expect(allowed(evaluatePositions({ dateOfBirth: "1980-01-01", roles: [] }, "Open", season))).toEqual([]);
  });
});

describe("nominationPosition", () => {
  it("maps stored nominations", () => {
    expect(nominationPosition({})).toBe("player");
    expect(nominationPosition({ nominationType: "official", role: "head_coach" })).toBe("head_coach");
    expect(nominationPosition({ nominationType: "official", role: "assistant_coach" })).toBe("assistant_coach");
  });
});
