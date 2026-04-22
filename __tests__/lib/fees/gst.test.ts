import { describe, it, expect } from "vitest";
import {
  GST_RATE,
  GST_DIVISOR,
  calculateGST,
  gstCents,
  formatGSTBreakdown,
  aggregateGSTFromLines,
} from "@/lib/fees/gst";

// ── Constants ─────────────────────────────────────────────────────────────────

describe("GST constants", () => {
  it("rate is 10%", () => {
    expect(GST_RATE).toBe(0.10);
  });

  it("divisor is 1.1", () => {
    expect(GST_DIVISOR).toBe(1.1);
  });
});

// ── calculateGST ─────────────────────────────────────────────────────────────

describe("calculateGST", () => {
  it("extracts GST from a round GST-inclusive amount — $110 → GST $10", () => {
    expect(calculateGST(11000)).toEqual({ gross: 11000, gst: 1000, net: 10000 });
  });

  it("extracts GST from $220 → GST $20", () => {
    expect(calculateGST(22000)).toEqual({ gross: 22000, gst: 2000, net: 20000 });
  });

  it("rounds correctly for non-round amount — $120", () => {
    // 12000 − 12000/1.1 = 12000 − 10909.09… = 1090.909… → round = 1091
    const bd = calculateGST(12000);
    expect(bd.gross).toBe(12000);
    expect(bd.gst).toBe(1091);
    expect(bd.net).toBe(10909);
    // invariant: gst + net === gross
    expect(bd.gst + bd.net).toBe(bd.gross);
  });

  it("returns zero GST when gstIncluded is false", () => {
    expect(calculateGST(11000, false)).toEqual({ gross: 11000, gst: 0, net: 11000 });
  });

  it("handles zero amount", () => {
    expect(calculateGST(0)).toEqual({ gross: 0, gst: 0, net: 0 });
    expect(calculateGST(0, false)).toEqual({ gross: 0, gst: 0, net: 0 });
  });

  it("gst + net === gross for a range of amounts (invariant)", () => {
    for (const cents of [1, 100, 110, 1100, 2500, 9999, 10000, 99999, 100000]) {
      const bd = calculateGST(cents);
      expect(bd.gst + bd.net).toBe(bd.gross);
    }
  });

  it("rounds fractional input to nearest integer", () => {
    // 11000.7 should be treated as 11001
    const bd = calculateGST(11000.7);
    expect(bd.gross).toBe(11001);
    expect(bd.gst + bd.net).toBe(bd.gross);
  });

  it("gst is always non-negative", () => {
    for (const cents of [0, 1, 50, 1000, 1100]) {
      expect(calculateGST(cents).gst).toBeGreaterThanOrEqual(0);
    }
  });

  it("defaults gstIncluded to true when omitted", () => {
    expect(calculateGST(11000)).toEqual(calculateGST(11000, true));
  });
});

// ── gstCents ─────────────────────────────────────────────────────────────────

describe("gstCents", () => {
  it("returns GST portion for inclusive amount", () => {
    expect(gstCents(11000, true)).toBe(1000);
  });

  it("returns 0 for GST-exclusive amount", () => {
    expect(gstCents(11000, false)).toBe(0);
  });

  it("matches calculateGST.gst", () => {
    expect(gstCents(12000, true)).toBe(calculateGST(12000).gst);
  });
});

// ── formatGSTBreakdown ────────────────────────────────────────────────────────

describe("formatGSTBreakdown", () => {
  it("formats GST-inclusive breakdown with GST amount", () => {
    const bd = calculateGST(11000); // $110 incl. $10 GST
    const result = formatGSTBreakdown(bd);
    expect(result).toContain("$110.00");
    expect(result).toContain("$10.00");
    expect(result).toContain("GST");
  });

  it("shows GST-free label when gst is 0", () => {
    const bd = { gross: 5000, gst: 0, net: 5000 };
    expect(formatGSTBreakdown(bd)).toContain("GST-free");
    expect(formatGSTBreakdown(bd)).toContain("$50.00");
  });

  it("does not show 'incl.' text when GST-free", () => {
    const bd = { gross: 5000, gst: 0, net: 5000 };
    expect(formatGSTBreakdown(bd)).not.toContain("incl.");
  });
});

// ── aggregateGSTFromLines ─────────────────────────────────────────────────────

describe("aggregateGSTFromLines", () => {
  it("returns zeros for empty array", () => {
    expect(aggregateGSTFromLines([])).toEqual({ totalGross: 0, totalGst: 0, totalNet: 0 });
  });

  it("aggregates GST across multiple GST-inclusive lines", () => {
    // $110 (GST $10) + $220 (GST $20) = $330 gross, $30 GST, $300 net
    const lines = [
      { amount: 110, gstIncluded: true },
      { amount: 220, gstIncluded: true },
    ];
    const result = aggregateGSTFromLines(lines);
    expect(result.totalGross).toBeCloseTo(330, 2);
    expect(result.totalGst).toBeCloseTo(30, 2);
    expect(result.totalNet).toBeCloseTo(300, 2);
  });

  it("GST-free lines contribute 0 GST", () => {
    const lines = [
      { amount: 110, gstIncluded: true },   // $10 GST
      { amount: 50,  gstIncluded: false },   // $0 GST
    ];
    const result = aggregateGSTFromLines(lines);
    expect(result.totalGross).toBeCloseTo(160, 2);
    expect(result.totalGst).toBeCloseTo(10, 2);
    expect(result.totalNet).toBeCloseTo(150, 2);
  });

  it("defaults gstIncluded to true when absent", () => {
    // No gstIncluded field → treated as GST-inclusive
    const lines = [{ amount: 110 }];
    const result = aggregateGSTFromLines(lines);
    expect(result.totalGst).toBeCloseTo(10, 2);
  });

  it("handles undefined amount as 0", () => {
    const result = aggregateGSTFromLines([{ gstIncluded: true }]);
    expect(result).toEqual({ totalGross: 0, totalGst: 0, totalNet: 0 });
  });

  it("totalGross - totalGst === totalNet", () => {
    const lines = [
      { amount: 120, gstIncluded: true },
      { amount: 55,  gstIncluded: false },
      { amount: 33,  gstIncluded: true },
    ];
    const { totalGross, totalGst, totalNet } = aggregateGSTFromLines(lines);
    expect(totalGross - totalGst).toBeCloseTo(totalNet, 5);
  });
});
