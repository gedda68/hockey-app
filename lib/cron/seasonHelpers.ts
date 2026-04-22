/**
 * lib/cron/seasonHelpers.ts
 *
 * Pure date-arithmetic helpers for the seasonal re-registration reminder
 * cron job (R6).  Extracted from the route handler so they can be unit-tested
 * without spinning up Next.js or a MongoDB connection.
 *
 * All helpers accept `now` as an optional parameter (defaults to `new Date()`)
 * so tests can control the reference date deterministically.
 */

// ── Season date helpers ───────────────────────────────────────────────────────

/**
 * How many whole calendar days from `now` until the 1st of
 * `seasonStartMonth` (1-indexed, Jan = 1).
 *
 * If that date has already passed this calendar year the calculation uses
 * the same month of NEXT year.  Result is always ≥ 0.
 *
 * @example
 * // Today is 2025-01-15, seasonStartMonth = 3 (March)
 * daysUntilSeasonStart(3, new Date("2025-01-15")) // → 45
 */
export function daysUntilSeasonStart(
  seasonStartMonth: number,
  now: Date = new Date(),
): number {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const yr      = today.getFullYear();
  let   target  = new Date(yr, seasonStartMonth - 1, 1); // month is 0-indexed in Date

  if (target <= today) {
    // This year's start has passed — use next year
    target = new Date(yr + 1, seasonStartMonth - 1, 1);
  }

  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

/**
 * Which reminder wave, if any, applies to the given number of days until
 * season start.
 *
 * Windows are intentionally wide so a weekly cron run reliably catches each
 * window even if a scheduled execution is delayed by a day or two.
 *
 *   "6w"  →  35–49 days out  (~5–7 weeks)
 *   "2w"  →   7–20 days out  (~1–3 weeks)
 *   null  →  outside both windows
 */
export function reminderLabelForDays(days: number): "6w" | "2w" | null {
  if (days >= 35 && days <= 49) return "6w";
  if (days >= 7  && days <= 20) return "2w";
  return null;
}

/**
 * The calendar year the UPCOMING season will start in.
 *
 * Logic:
 *   • If the 1st of `seasonStartMonth` is still in the future → that year.
 *   • If it has already passed → next year.
 *
 * @example
 * // Today 2025-01-15, seasonStartMonth = 3 → "2025"  (March 2025 is ahead)
 * // Today 2025-04-01, seasonStartMonth = 3 → "2026"  (March 2025 has passed)
 */
export function upcomingSeasonYearFor(
  seasonStartMonth: number,
  now: Date = new Date(),
): string {
  const today  = new Date(now);
  today.setHours(0, 0, 0, 0);

  const yr     = today.getFullYear();
  const target = new Date(yr, seasonStartMonth - 1, 1);

  return (target > today ? yr : yr + 1).toString();
}

/**
 * The calendar year of the CURRENT (most-recently-started) season.
 *
 * Logic:
 *   • If the 1st of `seasonStartMonth` has already occurred this year → this year.
 *   • If it is still in the future → last year.
 *
 * @example
 * // Today 2025-04-01, seasonStartMonth = 3 → "2025"  (March 2025 has started)
 * // Today 2025-01-15, seasonStartMonth = 3 → "2024"  (March 2025 hasn't started yet)
 */
export function currentSeasonYearFor(
  seasonStartMonth: number,
  now: Date = new Date(),
): string {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const yr    = today.getFullYear();
  const start = new Date(yr, seasonStartMonth - 1, 1);

  return (start <= today ? yr : yr - 1).toString();
}
