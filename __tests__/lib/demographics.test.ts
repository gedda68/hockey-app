import { describe, it, expect } from "vitest";
import { COUNTRIES, cleanDemographics, isIndigenous, matchCountry } from "@/lib/members/demographics";

describe("demographics", () => {
  it("matches countries however they are typed", () => {
    expect(matchCountry("new zealand")).toBe("New Zealand");
    expect(matchCountry(" USA ")).toBe("United States");
    expect(matchCountry("turkiye")).toBe("Türkiye");
    expect(matchCountry("cote d'ivoire")).toBe("Côte d'Ivoire");
    expect(matchCountry("Atlantis")).toBeNull();
    expect(matchCountry("")).toBeNull();
    expect(new Set(COUNTRIES).size).toBe(COUNTRIES.length);
    expect(COUNTRIES.length).toBeGreaterThan(190);
  });
  it("keeps only recognised answers", () => {
    expect(cleanDemographics({ indigenousStatus: "both", nationality: "australia" })).toEqual({ indigenousStatus: "both", nationality: "Australia" });
    expect(cleanDemographics({ indigenousStatus: "maybe", nationality: "nowhere" })).toEqual({});
    expect(cleanDemographics({ indigenousStatus: "", nationality: "" })).toEqual({});
    expect(cleanDemographics(null)).toEqual({});
  });
  it("knows who counts as Aboriginal or Torres Strait Islander", () => {
    expect(["aboriginal", "torres-strait-islander", "both"].every(isIndigenous)).toBe(true);
    expect(isIndigenous("no")).toBe(false);
    expect(isIndigenous("not-stated")).toBe(false);
  });
});
