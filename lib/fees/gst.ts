/**
 * lib/fees/gst.ts
 *
 * Australian GST (Goods and Services Tax) calculation utilities.
 *
 * ── Rate ──────────────────────────────────────────────────────────────────────
 *   10% as legislated in A New Tax System (Goods and Services Tax) Act 1999.
 *   Change GST_RATE here if the rate ever changes — everything else derives
 *   from it automatically.
 *
 * ── Amount representation ────────────────────────────────────────────────────
 *   All public functions operate on INTEGER CENTS to avoid floating-point drift.
 *   The only exception is `aggregateGSTFromLines()` which works with dollar
 *   amounts as stored in the `payments.lineItems[].amount` collection field.
 *
 * ── Rounding ─────────────────────────────────────────────────────────────────
 *   We use "round half up" (Math.round) throughout, matching the ATO's
 *   recommended approach for GST apportionment.
 *
 * ── GST-inclusive formula ────────────────────────────────────────────────────
 *   When a price already includes GST:
 *     gst = round(gross × 1/11) = round(gross − gross / 1.1)
 *     net = gross − gst
 *
 * ── Future ────────────────────────────────────────────────────────────────────
 *   Epic F6 (BAS/quarterly GST summary) will consume `aggregateGSTFromLines`
 *   and `calculateGST` directly.  No changes to the calling code needed if the
 *   rate changes — only GST_RATE below.
 */

/** Australian GST rate. */
export const GST_RATE = 0.10;

/** Divisor for extracting GST from a GST-inclusive price (1 + GST_RATE). */
export const GST_DIVISOR = 1 + GST_RATE; // 1.1

// ── Core breakdown type ───────────────────────────────────────────────────────

export interface GSTBreakdown {
  /** Total price paid by the buyer, in cents.  Always === the input amount. */
  gross: number;
  /** GST component extracted from gross, in cents.  Zero when !gstIncluded. */
  gst: number;
  /** Amount excluding GST, in cents.  gross − gst. */
  net: number;
}

// ── Primary calculator ────────────────────────────────────────────────────────

/**
 * Compute the full GST breakdown for a given amount.
 *
 * @param amountCents   Non-negative integer cents.
 * @param gstIncluded   `true` (default) — GST is already baked into the price;
 *                      extract it using the ATO 1/11 formula.
 *                      `false` — no GST applies; gst = 0, net = gross.
 */
export function calculateGST(
  amountCents: number,
  gstIncluded = true,
): GSTBreakdown {
  const gross = Math.round(amountCents); // guard against fractional input
  if (!gstIncluded) {
    return { gross, gst: 0, net: gross };
  }
  // ATO formula: GST = gross × 1/11
  const gst = Math.round(gross - gross / GST_DIVISOR);
  return { gross, gst, net: gross - gst };
}

// ── Convenience helpers ───────────────────────────────────────────────────────

/**
 * Return just the GST cents for an amount.
 * Equivalent to `calculateGST(amountCents, gstIncluded).gst`.
 */
export function gstCents(amountCents: number, gstIncluded: boolean): number {
  return calculateGST(amountCents, gstIncluded).gst;
}

// ── Display formatting ────────────────────────────────────────────────────────

/**
 * Format a GSTBreakdown as a human-readable string.
 *
 * @example
 * formatGSTBreakdown({ gross: 11000, gst: 1000, net: 10000 })
 * // → "$110.00 (incl. $10.00 GST)"
 *
 * @example
 * formatGSTBreakdown({ gross: 5000, gst: 0, net: 5000 })
 * // → "$50.00 (GST-free)"
 */
export function formatGSTBreakdown(
  breakdown: GSTBreakdown,
  currency = "AUD",
): string {
  const fmt = (c: number) =>
    new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(c / 100);

  return breakdown.gst > 0
    ? `${fmt(breakdown.gross)} (incl. ${fmt(breakdown.gst)} GST)`
    : `${fmt(breakdown.gross)} (GST-free)`;
}

// ── Bulk aggregation (financial reporting) ────────────────────────────────────

/**
 * Aggregate GST totals across a collection of line items.
 *
 * Line item `amount` is in DOLLARS (as stored in `payments.lineItems[].amount`).
 * Returns totals in DOLLARS, rounded to the nearest cent.
 *
 * Used by:
 *   • `lib/financials/registrationPaymentSummary.ts`
 *   • Future F6 BAS/quarterly GST helper
 */
export function aggregateGSTFromLines(
  lines: ReadonlyArray<{ amount?: number; gstIncluded?: boolean }>,
): { totalGross: number; totalGst: number; totalNet: number } {
  let grossCents = 0;
  let gstTotalCents = 0;

  for (const line of lines) {
    const amountCents = Math.round((line.amount ?? 0) * 100);
    const bd          = calculateGST(amountCents, line.gstIncluded ?? true);
    grossCents    += bd.gross;
    gstTotalCents += bd.gst;
  }

  const netCents = grossCents - gstTotalCents;
  return {
    totalGross: grossCents / 100,
    totalGst:   gstTotalCents / 100,
    totalNet:   netCents / 100,
  };
}
