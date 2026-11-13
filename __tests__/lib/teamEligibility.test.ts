import { describe, it, expect } from "vitest";
import { teamTier, ageInSeason, checkTeamEligibility } from "@/lib/rosters/teamEligibility";

const t = (...names: string[]) => names.map((teamName) => ({ teamName }));
const base = { category: "senior", season: "2026", dateOfBirth: "1995-05-05" };

describe("teamTier / ageInSeason", () => {
  it("reads the trailing number", () => {
    expect(teamTier("BHL2")).toBe(2);
    expect(teamTier("Div 10 ")).toBe(10);
    expect(teamTier("Reserves")).toBeNull();
  });
  it("age is season year minus birth year", () => {
    expect(ageInSeason("2011-12-31", "2026")).toBe(15);
    expect(ageInSeason("", "2026")).toBeNull();
  });
});

describe("checkTeamEligibility", () => {
  it("allows adjacent teams", () => {
    expect(checkTeamEligibility({ ...base, newTeamName: "BHL2", existing: t("BHL1") }).ok).toBe(true);
    expect(checkTeamEligibility({ ...base, newTeamName: "BHL2", existing: t("BHL3") }).ok).toBe(true);
    expect(checkTeamEligibility({ ...base, newTeamName: "BHL3", existing: t("BHL2") }).ok).toBe(true);
  });
  it("blocks teams two or more apart", () => {
    const r = checkTeamEligibility({ ...base, newTeamName: "BHL3", existing: t("BHL1") });
    expect(r.ok).toBe(false);
    expect((r as any).code).toBe("TIER_GAP");
    // BHL1 + BHL2 held, BHL3 would span 1..3
    expect(checkTeamEligibility({ ...base, newTeamName: "BHL3", existing: t("BHL1", "BHL2") }).ok).toBe(false);
    expect(checkTeamEligibility({ ...base, newTeamName: "BHL4", existing: t("BHL1") }).ok).toBe(false);
  });
  it("blocks duplicates in the same team", () => {
    expect((checkTeamEligibility({ ...base, newTeamName: "BHL1", existing: t("BHL1") }) as any).code).toBe("ALREADY_IN_TEAM");
  });
  it("juniors need to be 15+ in the season year to play seniors", () => {
    const young = { ...base, dateOfBirth: "2012-03-01", newTeamName: "BHL1", existing: [] };
    expect((checkTeamEligibility(young) as any).code).toBe("TOO_YOUNG"); // 14
    expect(checkTeamEligibility({ ...young, dateOfBirth: "2011-12-31" }).ok).toBe(true); // 15
    expect(checkTeamEligibility({ ...young, category: "junior" }).ok).toBe(true);
    expect(checkTeamEligibility({ ...young, dateOfBirth: "" }).ok).toBe(true); // unknown DOB not blocked
  });
});
