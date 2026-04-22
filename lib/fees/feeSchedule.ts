/**
 * lib/fees/feeSchedule.ts
 *
 * Pure helpers for resolving a club / association fee schedule entry.
 * No database access here — the caller supplies the schedule array (loaded from
 * MongoDB) and receives a lookup result.
 *
 * Design notes
 * ─────────────
 * • All functions are pure (no side-effects) so they are trivially unit-testable.
 * • The resolver intentionally does NOT mutate requiresFee on the role definition —
 *   it is the responsibility of the caller (POST /api/role-requests) to check
 *   roleDef.requiresFee before charging a fee.
 * • When requiresFee is true but no schedule entry is found the fee amount is
 *   left undefined on the request document (admin will be prompted to set one).
 */

import type { UserRole } from "@/lib/types/roles";
import type { FeeScheduleEntry } from "@/types/feeSchedule";

// ── Core resolver ─────────────────────────────────────────────────────────────

/**
 * Find the fee entry for a specific (role, seasonYear) pair.
 *
 * @param schedule   The `feeSchedule[]` array stored on a club/association doc.
 * @param role       The requested UserRole.
 * @param seasonYear Four-digit season year, e.g. "2025".
 * @returns The matching entry, or `null` if none found.
 */
export function resolveFeeFromSchedule(
  schedule: FeeScheduleEntry[] | null | undefined,
  role: UserRole,
  seasonYear: string,
): FeeScheduleEntry | null {
  if (!Array.isArray(schedule) || schedule.length === 0) return null;
  return (
    schedule.find(
      (entry) => entry.role === role && entry.seasonYear === seasonYear,
    ) ?? null
  );
}

// ── Fallback-aware resolver ───────────────────────────────────────────────────

/**
 * Resolve the fee from the club schedule first, then fall back to the
 * association schedule if no club-level entry is found.
 *
 * Use this for club-scoped role requests where the association may set a
 * default that clubs can override.
 *
 * @param clubSchedule        Schedule stored on the club document.
 * @param associationSchedule Schedule stored on the parent association document.
 * @param role                The requested UserRole.
 * @param seasonYear          Four-digit season year.
 * @returns The resolved entry, or `null` if neither schedule has a match.
 */
export function resolveFeeWithFallback(
  clubSchedule: FeeScheduleEntry[] | null | undefined,
  associationSchedule: FeeScheduleEntry[] | null | undefined,
  role: UserRole,
  seasonYear: string,
): FeeScheduleEntry | null {
  return (
    resolveFeeFromSchedule(clubSchedule, role, seasonYear) ??
    resolveFeeFromSchedule(associationSchedule, role, seasonYear)
  );
}

// ── Formatting helpers (used in feeDescription) ───────────────────────────────

/**
 * Format an `amountCents` value for human-readable display.
 * e.g. 12000 → "$120.00 AUD"
 */
export function formatFeeAmount(entry: Pick<FeeScheduleEntry, "amountCents" | "currency">): string {
  const dollars = entry.amountCents / 100;
  return `$${dollars.toFixed(2)} ${entry.currency}`;
}

/**
 * Build a human-readable fee description string for the role-request document.
 * e.g. "2025 Player Registration — Commercial Hockey Club  [$120.00 AUD]"
 */
export function buildFeeDescription(
  entry: FeeScheduleEntry,
  roleLabel: string,
  scopeName: string,
): string {
  return `${entry.seasonYear} ${roleLabel} Registration — ${scopeName} [${formatFeeAmount(entry)}]`;
}

// ── Validation ────────────────────────────────────────────────────────────────

/**
 * Validate a raw fee schedule array (from a form submission) and return any
 * duplicate (role, seasonYear) pairs so the API can reject them.
 *
 * @returns Array of error strings; empty = valid.
 */
export function validateFeeSchedule(entries: FeeScheduleEntry[]): string[] {
  const errors: string[] = [];
  const seen = new Map<string, number>();

  entries.forEach((entry, idx) => {
    const key = `${entry.role}::${entry.seasonYear}`;
    if (seen.has(key)) {
      errors.push(
        `Duplicate fee schedule entry at row ${idx + 1}: role "${entry.role}" season "${entry.seasonYear}" already defined at row ${(seen.get(key) ?? 0) + 1}.`,
      );
    } else {
      seen.set(key, idx);
    }

    if (!Number.isInteger(entry.amountCents) || entry.amountCents < 0) {
      errors.push(
        `Row ${idx + 1}: amountCents must be a non-negative integer (got ${entry.amountCents}).`,
      );
    }

    if (!/^\d{4}$/.test(entry.seasonYear)) {
      errors.push(
        `Row ${idx + 1}: seasonYear must be a four-digit year (got "${entry.seasonYear}").`,
      );
    }
  });

  return errors;
}
