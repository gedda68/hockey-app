import { describe, it, expect } from "vitest";
import { classifyPosition, windowAgeGroup, evaluateClubPosition } from "@/lib/nominations/clubPositions";

describe("classifyPosition", () => {
  it("recognises the position kinds", () => {
    expect(classifyPosition({ positionTitle: "U12 Head Coach" })).toBe("coaching");
    expect(classifyPosition({ positionRole: "assistant_coach" })).toBe("assistant-coaching");
    expect(classifyPosition({ positionTitle: "Club Secretary" })).toBe("admin");
    expect(classifyPosition({ positionTitle: "Committee Member" })).toBe("committee");
    expect(classifyPosition({ positionTitle: "Team Manager" })).toBe("management");
    expect(classifyPosition({ positionTitle: "Umpire Coordinator" })).toBe("umpiring");
    expect(classifyPosition({ positionTitle: "Canteen helper" })).toBe("other");
  });
});

describe("windowAgeGroup", () => {
  it("reads the age group from field or title", () => {
    expect(windowAgeGroup({ ageGroup: "Under 14" })).toBe("Under 14");
    expect(windowAgeGroup({ positionTitle: "U12 Head Coach" })).toBe("Under 12");
    expect(windowAgeGroup({ positionTitle: "Open Men Manager" })).toBe("Open");
    expect(windowAgeGroup({ positionTitle: "Treasurer" })).toBeNull();
  });
});

describe("evaluateClubPosition", () => {
  const season = 2026;
  it("applies the age-group minimum to coaching roles", () => {
    expect(evaluateClubPosition({ dateOfBirth: "2012-01-01" }, { positionTitle: "U12 Head Coach" }, season).allowed).toBe(false);
    expect(evaluateClubPosition({ dateOfBirth: "2008-01-01" }, { positionTitle: "U12 Head Coach" }, season).allowed).toBe(true);
  });
  it("requires 18+ for admin/committee, nothing for umpiring", () => {
    expect(evaluateClubPosition({ dateOfBirth: "2012-01-01" }, { positionTitle: "Club Secretary" }, season).allowed).toBe(false);
    expect(evaluateClubPosition({ dateOfBirth: "1990-01-01" }, { positionTitle: "Committee Member" }, season).allowed).toBe(true);
    expect(evaluateClubPosition({ dateOfBirth: "2013-01-01" }, { positionTitle: "Junior Umpire" }, season).allowed).toBe(true);
  });
  it("needs a date of birth where there is an age rule", () => {
    expect(evaluateClubPosition({}, { positionTitle: "Club Secretary" }, season).reason).toMatch(/date of birth/);
  });
});
