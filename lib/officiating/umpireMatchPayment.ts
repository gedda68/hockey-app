// lib/officiating/umpireMatchPayment.ts
// Resolve tiered umpire match fees from qualification + match level.

import type { UmpirePaymentRateCell } from "@/lib/db/schemas/umpireMatchPayment.schema";

function normKey(s: string): string {
  return s.trim().toLowerCase();
}

export function lookupUmpireMatchPaymentCents(
  rates: UmpirePaymentRateCell[],
  qualificationTier: string,
  matchLevel: string,
): { amountCents: number; currency: string; matchedCell: UmpirePaymentRateCell } | null {
  const q = normKey(qualificationTier);
  const m = normKey(matchLevel);
  for (const cell of rates) {
    if (normKey(cell.qualificationTier) === q && normKey(cell.matchLevel) === m) {
      return {
        amountCents: cell.amountCents,
        currency: cell.currency ?? "AUD",
        matchedCell: cell,
      };
    }
  }
  return null;
}

export type UmpirePaymentPreviewLine = {
  umpireId: string;
  umpireType?: string;
  qualificationTier: string;
  matchLevel: string;
  amountCents: number | null;
  currency: string;
  missingRate: boolean;
};

export function previewUmpirePaymentsForFixture(opts: {
  rates: UmpirePaymentRateCell[];
  defaultCurrency: string;
  matchLevel: string;
  umpires: Array<{
    umpireId: string;
    umpireType?: string;
    qualificationTier?: string | null;
  }>;
  /** Used when slot has no qualificationTier (e.g. legacy data). */
  defaultQualificationTier: string;
}): UmpirePaymentPreviewLine[] {
  const { rates, defaultCurrency, matchLevel, umpires, defaultQualificationTier } = opts;
  return umpires.map((u) => {
    const tier = (u.qualificationTier?.trim() || defaultQualificationTier).trim();
    const hit = lookupUmpireMatchPaymentCents(rates, tier, matchLevel);
    return {
      umpireId: u.umpireId,
      umpireType: u.umpireType,
      qualificationTier: tier,
      matchLevel,
      amountCents: hit?.amountCents ?? null,
      currency: hit?.currency ?? defaultCurrency,
      missingRate: hit == null,
    };
  });
}
