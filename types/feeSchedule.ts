/**
 * types/feeSchedule.ts
 *
 * Per-club / per-association registration fee schedule.
 *
 * Each entry maps a specific (role, seasonYear) pair to a fee amount in cents.
 * This is the authoritative source consulted by POST /api/role-requests when
 * building the `feeAmountCents` stored on the RoleRequest document.
 *
 * ── Storage ──────────────────────────────────────────────────────────────────
 *
 *   clubs.feeSchedule:         FeeScheduleEntry[]
 *   associations.feeSchedule:  FeeScheduleEntry[]
 *
 * When a role-request is submitted for a club-scoped role the club's schedule is
 * consulted first; if no matching entry is found the parent association's schedule
 * is checked as a fallback.  Association-scoped roles consult only the
 * association's own schedule.
 *
 * ── Amount representation ────────────────────────────────────────────────────
 *
 *   amountCents   Integer, cents AUD — avoids floating-point drift.
 *                 e.g. AUD $120.00 → 12000.
 *   currency      Always "AUD" for now; included for future multi-currency support.
 *
 * ── Example document ─────────────────────────────────────────────────────────
 *
 *   {
 *     role:        "player",
 *     seasonYear:  "2025",
 *     amountCents: 12000,   // $120.00 AUD
 *     currency:    "AUD",
 *   }
 */

import type { UserRole } from "@/lib/types/roles";

export interface FeeScheduleEntry {
  /** The role this fee applies to. */
  role: UserRole;

  /**
   * Four-digit season / registration year, e.g. "2025".
   * Combined with `role` to form the lookup key.
   */
  seasonYear: string;

  /**
   * Fee amount in the smallest currency unit (cents AUD).
   * Must be a non-negative integer.
   * 0 = no fee (different from a missing entry: admin explicitly set $0).
   */
  amountCents: number;

  /** Currency code. Always "AUD" — stored explicitly for forward compatibility. */
  currency: "AUD";

  /**
   * Whether the `amountCents` is GST-inclusive (true, the AUS default) or
   * GST-exclusive (false, used for genuinely GST-free supplies).
   * When omitted the receipt display treats the fee as GST-inclusive.
   */
  gstIncluded?: boolean;
}

/**
 * Body accepted by the fee-schedule save endpoint and passed through the form.
 * Same shape as FeeScheduleEntry but the currency defaults to "AUD" when omitted.
 */
export type FeeScheduleEntryInput = Omit<FeeScheduleEntry, "currency"> & {
  currency?: "AUD";
};
