import { describe, expect, it } from "vitest";
import {
  lookupUmpireMatchPaymentCents,
  previewUmpirePaymentsForFixture,
} from "@/lib/officiating/umpireMatchPayment";

describe("lookupUmpireMatchPaymentCents", () => {
  const rates = [
    {
      qualificationTier: "Level_1",
      matchLevel: "League",
      amountCents: 5000,
      currency: "AUD",
    },
  ];

  it("matches case-insensitively", () => {
    const hit = lookupUmpireMatchPaymentCents(rates, "level_1", "league");
    expect(hit?.amountCents).toBe(5000);
  });

  it("returns null when no row", () => {
    expect(lookupUmpireMatchPaymentCents(rates, "x", "y")).toBeNull();
  });
});

describe("previewUmpirePaymentsForFixture", () => {
  it("uses default qualification when slot omits tier", () => {
    const lines = previewUmpirePaymentsForFixture({
      rates: [
        {
          qualificationTier: "standard",
          matchLevel: "league",
          amountCents: 4200,
          currency: "AUD",
        },
      ],
      defaultCurrency: "AUD",
      matchLevel: "league",
      defaultQualificationTier: "standard",
      umpires: [{ umpireId: "u1", umpireType: "umpire1" }],
    });
    expect(lines).toHaveLength(1);
    expect(lines[0].amountCents).toBe(4200);
    expect(lines[0].missingRate).toBe(false);
  });

  it("marks missing rate when matrix has no cell", () => {
    const lines = previewUmpirePaymentsForFixture({
      rates: [],
      defaultCurrency: "AUD",
      matchLevel: "finals",
      defaultQualificationTier: "standard",
      umpires: [{ umpireId: "u1", umpireType: "umpire1" }],
    });
    expect(lines[0].missingRate).toBe(true);
    expect(lines[0].amountCents).toBeNull();
  });
});
