import { describe, expect, it } from "vitest";
import {
  LEVEL_MAP,
  associationLevelDisplay,
  associationLevelSummary,
} from "@/lib/domain/associationLevelDisplay";

describe("associationLevelDisplay", () => {
  it("aligns depth 0–3 with numericLevelToString tiers", () => {
    expect(associationLevelDisplay(0).canonicalKey).toBe("national");
    expect(associationLevelDisplay(1).canonicalKey).toBe("state");
    expect(associationLevelDisplay(2).canonicalKey).toBe("city");
    expect(associationLevelDisplay(3).canonicalKey).toBe("district");
    expect(associationLevelDisplay(9).canonicalKey).toBe("district");
  });

  it("exposes consistent LEVEL_MAP entries", () => {
    expect(LEVEL_MAP[1].short).toBe("L1");
    expect(LEVEL_MAP[2].label).toContain("Metro");
    expect(associationLevelSummary(2)).toMatch(/L2/);
  });

  it("treats missing level as 0 for API summaries", () => {
    expect(associationLevelSummary(undefined)).toMatch(/^L0/);
  });
});
