// lib/lineups/lineupLock.ts
// Match-day squad edit window.
//
// Rule: a club may change its roster for a fixture up to 5 minutes before the
// scheduled start. Once the match has started (or finished) it is locked.
// Association administrators may still correct a squad afterwards, but only
// with a written reason, and the change is audited.

export const LINEUP_CUTOFF_MINUTES = 5;

export type LineupActor = "club" | "association";

export interface LineupWindowInput {
  scheduledStart?: string | Date | null;
  status?: string | null;
  now?: Date;
  actor: LineupActor;
}

export interface LineupWindow {
  /** The actor may save a change right now. */
  open: boolean;
  /** Instant the club window closes (null when the fixture has no usable start time). */
  closesAt: string | null;
  /** Window is closed for clubs but an association admin may override with a reason. */
  requiresReason: boolean;
  /** Why the window is closed (or null when it is open without conditions). */
  reason: string | null;
}

const STARTED_STATUSES = new Set(["in_progress", "completed"]);

function parseStart(v: string | Date | null | undefined): Date | null {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function lineupEditWindow(input: LineupWindowInput): LineupWindow {
  const now = input.now ?? new Date();
  const start = parseStart(input.scheduledStart);
  const closesAtDate = start
    ? new Date(start.getTime() - LINEUP_CUTOFF_MINUTES * 60_000)
    : null;
  const closesAt = closesAtDate ? closesAtDate.toISOString() : null;
  const status = input.status ?? "scheduled";

  let clubClosedReason: string | null = null;
  if (status === "cancelled") {
    clubClosedReason = "This match was cancelled.";
  } else if (STARTED_STATUSES.has(status)) {
    clubClosedReason = "The match has started, so the roster is locked.";
  } else if (status !== "postponed" && start && now.getTime() >= start.getTime()) {
    clubClosedReason = "The match has started, so the roster is locked.";
  } else if (
    status !== "postponed" &&
    closesAtDate &&
    now.getTime() > closesAtDate.getTime()
  ) {
    clubClosedReason = `Rosters lock ${LINEUP_CUTOFF_MINUTES} minutes before the scheduled start.`;
  }

  if (!clubClosedReason) {
    return { open: true, closesAt, requiresReason: false, reason: null };
  }
  if (input.actor === "association") {
    return { open: true, closesAt, requiresReason: true, reason: clubClosedReason };
  }
  return { open: false, closesAt, requiresReason: false, reason: clubClosedReason };
}
