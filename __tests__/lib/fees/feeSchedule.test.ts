/**
 * __tests__/lib/fees/feeSchedule.test.ts
 *
 * Unit tests for the fee-schedule resolver (P1).
 * All functions are pure — no DB, no mocks required.
 */

import { describe, it, expect } from "vitest";
import {
  resolveFeeFromSchedule,
  resolveFeeWithFallback,
  buildFeeDescription,
  formatFeeAmount,
  validateFeeSchedule,
} from "@/lib/fees/feeSchedule";
import type { FeeScheduleEntry } from "@/types/feeSchedule";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const player2025: FeeScheduleEntry = {
  role:        "player",
  seasonYear:  "2025",
  amountCents: 12000,
  currency:    "AUD",
};

const player2026: FeeScheduleEntry = {
  role:        "player",
  seasonYear:  "2026",
  amountCents: 13000,
  currency:    "AUD",
};

const member2025: FeeScheduleEntry = {
  role:        "member",
  seasonYear:  "2025",
  amountCents: 5000,
  currency:    "AUD",
};

const freeEntry: FeeScheduleEntry = {
  role:        "volunteer",
  seasonYear:  "2025",
  amountCents: 0,    // explicitly $0 — different from "no entry"
  currency:    "AUD",
};

const CLUB_SCHEDULE: FeeScheduleEntry[] = [player2025, player2026, freeEntry];
const ASSOC_SCHEDULE: FeeScheduleEntry[] = [player2025, member2025];

// ── resolveFeeFromSchedule ────────────────────────────────────────────────────

describe("resolveFeeFromSchedule", () => {
  it("returns the matching entry when role and year both match", () => {
    const result = resolveFeeFromSchedule(CLUB_SCHEDULE, "player", "2025");
    expect(result).toEqual(player2025);
  });

  it("returns null when role matches but year does not", () => {
    const result = resolveFeeFromSchedule(CLUB_SCHEDULE, "player", "2024");
    expect(result).toBeNull();
  });

  it("returns null when year matches but role does not", () => {
    const result = resolveFeeFromSchedule(CLUB_SCHEDULE, "coach", "2025");
    expect(result).toBeNull();
  });

  it("returns null for an empty schedule", () => {
    expect(resolveFeeFromSchedule([], "player", "2025")).toBeNull();
  });

  it("returns null for a null schedule", () => {
    expect(resolveFeeFromSchedule(null, "player", "2025")).toBeNull();
  });

  it("returns null for an undefined schedule", () => {
    expect(resolveFeeFromSchedule(undefined, "player", "2025")).toBeNull();
  });

  it("returns the 2026 entry when the schedule has multiple years", () => {
    const result = resolveFeeFromSchedule(CLUB_SCHEDULE, "player", "2026");
    expect(result).toEqual(player2026);
    expect(result?.amountCents).toBe(13000);
  });

  it("returns a $0 entry (explicitly free) rather than null", () => {
    const result = resolveFeeFromSchedule(CLUB_SCHEDULE, "volunteer", "2025");
    expect(result).toEqual(freeEntry);
    expect(result?.amountCents).toBe(0);
  });
});

// ── resolveFeeWithFallback ────────────────────────────────────────────────────

describe("resolveFeeWithFallback", () => {
  it("returns the club-level entry when one exists", () => {
    const result = resolveFeeWithFallback(
      CLUB_SCHEDULE,
      ASSOC_SCHEDULE,
      "player",
      "2025",
    );
    // Both have player 2025; club takes precedence
    expect(result).toEqual(player2025);
  });

  it("falls back to the association schedule when club has no matching entry", () => {
    // CLUB_SCHEDULE has no 'member' entry; ASSOC_SCHEDULE does
    const result = resolveFeeWithFallback(
      CLUB_SCHEDULE,
      ASSOC_SCHEDULE,
      "member",
      "2025",
    );
    expect(result).toEqual(member2025);
  });

  it("returns null when neither schedule has a match", () => {
    const result = resolveFeeWithFallback(
      CLUB_SCHEDULE,
      ASSOC_SCHEDULE,
      "coach",
      "2025",
    );
    expect(result).toBeNull();
  });

  it("returns null when both schedules are null", () => {
    expect(
      resolveFeeWithFallback(null, null, "player", "2025"),
    ).toBeNull();
  });

  it("works when the club schedule is empty and association has a match", () => {
    expect(
      resolveFeeWithFallback([], ASSOC_SCHEDULE, "member", "2025"),
    ).toEqual(member2025);
  });

  it("returns the club schedule result even when the association also has a match", () => {
    const clubEntry: FeeScheduleEntry = {
      role: "player", seasonYear: "2025", amountCents: 9900, currency: "AUD",
    };
    const result = resolveFeeWithFallback(
      [clubEntry],
      ASSOC_SCHEDULE,
      "player",
      "2025",
    );
    expect(result?.amountCents).toBe(9900); // club wins over assoc's 12000
  });
});

// ── formatFeeAmount ───────────────────────────────────────────────────────────

describe("formatFeeAmount", () => {
  it("formats 12000 cents as $120.00 AUD", () => {
    expect(formatFeeAmount(player2025)).toBe("$120.00 AUD");
  });

  it("formats 0 cents as $0.00 AUD", () => {
    expect(formatFeeAmount(freeEntry)).toBe("$0.00 AUD");
  });

  it("formats 1 cent as $0.01 AUD", () => {
    expect(formatFeeAmount({ amountCents: 1, currency: "AUD" })).toBe(
      "$0.01 AUD",
    );
  });

  it("formats 9999 cents as $99.99 AUD", () => {
    expect(formatFeeAmount({ amountCents: 9999, currency: "AUD" })).toBe(
      "$99.99 AUD",
    );
  });
});

// ── buildFeeDescription ───────────────────────────────────────────────────────

describe("buildFeeDescription", () => {
  it("builds a readable fee description string", () => {
    const desc = buildFeeDescription(player2025, "Player", "Commercial Hockey Club");
    expect(desc).toBe(
      "2025 Player Registration — Commercial Hockey Club [$120.00 AUD]",
    );
  });

  it("includes the scope name in the description", () => {
    const desc = buildFeeDescription(member2025, "General Member", "BHA");
    expect(desc).toContain("BHA");
  });

  it("includes the season year in the description", () => {
    const desc = buildFeeDescription(player2026, "Player", "CHC");
    expect(desc).toContain("2026");
  });
});

// ── validateFeeSchedule ───────────────────────────────────────────────────────

describe("validateFeeSchedule", () => {
  it("returns no errors for a valid schedule", () => {
    const errors = validateFeeSchedule([player2025, player2026, member2025]);
    expect(errors).toHaveLength(0);
  });

  it("returns an error for duplicate (role, seasonYear) pairs", () => {
    const errors = validateFeeSchedule([player2025, player2025]);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/duplicate/i);
  });

  it("accepts two entries with the same role but different years", () => {
    const errors = validateFeeSchedule([player2025, player2026]);
    expect(errors).toHaveLength(0);
  });

  it("accepts two entries with the same year but different roles", () => {
    const errors = validateFeeSchedule([player2025, member2025]);
    expect(errors).toHaveLength(0);
  });

  it("returns an error for a negative amountCents", () => {
    const invalid: FeeScheduleEntry = {
      ...player2025,
      amountCents: -1,
    };
    const errors = validateFeeSchedule([invalid]);
    expect(errors.some((e) => /amountCents/i.test(e))).toBe(true);
  });

  it("returns an error for a non-integer amountCents", () => {
    const invalid: FeeScheduleEntry = {
      ...player2025,
      amountCents: 12.5,
    };
    const errors = validateFeeSchedule([invalid]);
    expect(errors.some((e) => /amountCents/i.test(e))).toBe(true);
  });

  it("returns an error for a non-4-digit seasonYear", () => {
    const invalid: FeeScheduleEntry = {
      ...player2025,
      seasonYear: "25",
    };
    const errors = validateFeeSchedule([invalid]);
    expect(errors.some((e) => /seasonYear/i.test(e))).toBe(true);
  });

  it("returns no errors for a $0 fee (explicitly free role)", () => {
    const errors = validateFeeSchedule([freeEntry]);
    expect(errors).toHaveLength(0);
  });

  it("returns no errors for an empty schedule", () => {
    expect(validateFeeSchedule([])).toHaveLength(0);
  });
});
