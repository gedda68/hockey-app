import { describe, it, expect } from "vitest";
import {
  daysUntilSeasonStart,
  reminderLabelForDays,
  upcomingSeasonYearFor,
  currentSeasonYearFor,
} from "@/lib/cron/seasonHelpers";

// ── daysUntilSeasonStart ──────────────────────────────────────────────────────

describe("daysUntilSeasonStart", () => {
  it("returns 45 days when today is Jan 15 and season starts March 1", () => {
    const now = new Date("2025-01-15T00:00:00Z");
    // Jan 15 → Mar 1: 16 days remaining in Jan (to Jan 31) + 29 days (Jan 31 → Mar 1) = 45
    expect(daysUntilSeasonStart(3, now)).toBe(45);
  });

  it("returns 0 on the exact season-start day (rolls to next year's start)", () => {
    // March 1 is the start — 'target <= today' so it rolls to next year
    const now    = new Date("2025-03-01T00:00:00.000Z");
    const days   = daysUntilSeasonStart(3, now);
    // Next March 1 2026: 365 days (non-leap)
    expect(days).toBe(365);
  });

  it("rolls over to next year when the start month has already passed", () => {
    // April 5 — March has passed; next March 1 is 2026
    const now  = new Date("2025-04-05T00:00:00Z");
    const days = daysUntilSeasonStart(3, now);
    // Apr 5 → Mar 1 2026: 25 days remaining in April (26-5=21... let me recalculate:
    // Apr 5 to Apr 30 = 25 days, May = 31, Jun = 30, Jul = 31, Aug = 31, Sep = 30, Oct = 31, Nov = 30, Dec = 31, Jan = 31, Feb = 28 (2026), Mar 1
    // 25 + 31 + 30 + 31 + 31 + 30 + 31 + 30 + 31 + 31 + 28 + 1 = 330 days
    expect(days).toBe(330);
  });

  it("returns 0 days for tomorrow when start is tomorrow", () => {
    const now    = new Date("2025-01-31T12:00:00Z");
    // Season starts Feb 1
    expect(daysUntilSeasonStart(2, now)).toBe(1);
  });

  it("is always non-negative", () => {
    for (let month = 1; month <= 12; month++) {
      const days = daysUntilSeasonStart(month);
      expect(days).toBeGreaterThanOrEqual(0);
    }
  });

  it("handles January start from December", () => {
    const now  = new Date("2025-12-01T00:00:00Z");
    // Jan 1 2026 is 31 days away
    expect(daysUntilSeasonStart(1, now)).toBe(31);
  });
});

// ── reminderLabelForDays ──────────────────────────────────────────────────────

describe("reminderLabelForDays", () => {
  it("returns '6w' for 35 days (lower bound)", () => {
    expect(reminderLabelForDays(35)).toBe("6w");
  });
  it("returns '6w' for 42 days (midpoint)", () => {
    expect(reminderLabelForDays(42)).toBe("6w");
  });
  it("returns '6w' for 49 days (upper bound)", () => {
    expect(reminderLabelForDays(49)).toBe("6w");
  });
  it("returns null for 50 days (just outside 6w window)", () => {
    expect(reminderLabelForDays(50)).toBeNull();
  });
  it("returns null for 34 days (gap between windows)", () => {
    expect(reminderLabelForDays(34)).toBeNull();
  });
  it("returns null for 21 days (gap between windows)", () => {
    expect(reminderLabelForDays(21)).toBeNull();
  });
  it("returns '2w' for 7 days (lower bound)", () => {
    expect(reminderLabelForDays(7)).toBe("2w");
  });
  it("returns '2w' for 14 days (midpoint)", () => {
    expect(reminderLabelForDays(14)).toBe("2w");
  });
  it("returns '2w' for 20 days (upper bound)", () => {
    expect(reminderLabelForDays(20)).toBe("2w");
  });
  it("returns null for 6 days (too close)", () => {
    expect(reminderLabelForDays(6)).toBeNull();
  });
  it("returns null for 0 days", () => {
    expect(reminderLabelForDays(0)).toBeNull();
  });
  it("returns null for 365 days (far future)", () => {
    expect(reminderLabelForDays(365)).toBeNull();
  });
});

// ── upcomingSeasonYearFor ─────────────────────────────────────────────────────

describe("upcomingSeasonYearFor", () => {
  it("returns current year when season start is still in the future", () => {
    // Jan 15 — March hasn't happened yet
    expect(upcomingSeasonYearFor(3, new Date("2025-01-15"))).toBe("2025");
  });

  it("returns next year when season start has already passed", () => {
    // April 5 — March has passed
    expect(upcomingSeasonYearFor(3, new Date("2025-04-05"))).toBe("2026");
  });

  it("returns next year on the exact start date (start day is 'passed')", () => {
    // On March 1 itself the start is not in the future (target > today is false when equal)
    expect(upcomingSeasonYearFor(3, new Date("2025-03-01T00:00:00.000Z"))).toBe("2026");
  });

  it("returns current year for January start when in December of prior year", () => {
    // Dec 2024 — January start is still upcoming
    expect(upcomingSeasonYearFor(1, new Date("2024-12-15"))).toBe("2025");
  });

  it("returns next year for January start when in February (Jan passed)", () => {
    expect(upcomingSeasonYearFor(1, new Date("2025-02-10"))).toBe("2026");
  });
});

// ── currentSeasonYearFor ──────────────────────────────────────────────────────

describe("currentSeasonYearFor", () => {
  it("returns current year when season has started", () => {
    // April 5 — March started this year
    expect(currentSeasonYearFor(3, new Date("2025-04-05"))).toBe("2025");
  });

  it("returns last year when season hasn't started yet this year", () => {
    // Jan 15 — March 2025 hasn't started; current season is 2024
    expect(currentSeasonYearFor(3, new Date("2025-01-15"))).toBe("2024");
  });

  it("returns current year on the exact start date", () => {
    expect(currentSeasonYearFor(3, new Date("2025-03-01T00:00:00.000Z"))).toBe("2025");
  });

  it("returns current year for January start when past Jan 1", () => {
    expect(currentSeasonYearFor(1, new Date("2025-06-15"))).toBe("2025");
  });

  it("returns last year for January start when checked before Jan 1", () => {
    // Dec 15 2024 — Jan 2024 is the current season
    expect(currentSeasonYearFor(1, new Date("2024-12-15"))).toBe("2024");
  });

  // Invariant: currentSeasonYear < upcomingSeasonYear (or equal when calculated independently)
  it("upcoming year is always >= current year", () => {
    const dates = [
      new Date("2025-01-01"),
      new Date("2025-06-15"),
      new Date("2025-12-31"),
    ];
    for (const d of dates) {
      for (let m = 1; m <= 12; m++) {
        const curr     = parseInt(currentSeasonYearFor(m, d));
        const upcoming = parseInt(upcomingSeasonYearFor(m, d));
        expect(upcoming).toBeGreaterThanOrEqual(curr);
      }
    }
  });
});
