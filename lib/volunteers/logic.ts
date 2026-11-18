// lib/volunteers/logic.ts
// Volunteer shifts (canteen, scoring, ground set-up…): validation, how full a shift is, who may sign up, and when
// reminders are due. Pure: no database access.

export const KINDS = ["canteen", "scoring", "ground_setup", "other"] as const;
export type ShiftKind = (typeof KINDS)[number];
export const KIND_LABELS: Record<ShiftKind, string> = { canteen: "Canteen", scoring: "Scoring", ground_setup: "Ground set-up", other: "Other" };

export interface ShiftInput {
  kind: ShiftKind;
  label: string;
  date: string; // YYYY-MM-DD in the playing zone
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  slots: number;
  location?: string;
  notes?: string;
  fixtureId?: string;
}

export interface ShiftLike { shiftId: string; date: string; startTime: string; endTime: string; slots: number; status: string }
export interface SignupLike { memberId: string; status: string; shiftId?: string }

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const HOUR = 3600_000;
const OFFSET = "+10:00"; // Australia/Brisbane has no daylight saving

const validDay = (d: string) => DAY_RE.test(d) && new Date(`${d}T00:00:00Z`).toISOString().slice(0, 10) === d;
const addDays = (d: string, n: number) => new Date(Date.parse(`${d}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);

export function cleanShift(body: unknown, today: string): { ok: true; value: ShiftInput; dates: string[] } | { ok: false; error: string } {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const kind = KINDS.find((k) => k === b.kind);
  if (!kind) return { ok: false, error: "Choose the kind of shift" };
  const custom = String(b.label ?? "").trim().slice(0, 80);
  if (kind === "other" && !custom) return { ok: false, error: "Name the job, e.g. BBQ" };
  const date = String(b.date ?? "");
  if (!validDay(date)) return { ok: false, error: "Choose the date" };
  if (date < today) return { ok: false, error: "That date has already passed" };
  const startTime = String(b.startTime ?? ""), endTime = String(b.endTime ?? "");
  if (!TIME_RE.test(startTime) || !TIME_RE.test(endTime)) return { ok: false, error: "Enter the start and end times" };
  if (endTime <= startTime) return { ok: false, error: "The shift has to end after it starts" };
  const slots = Math.round(Number(b.slots ?? 1));
  if (!Number.isFinite(slots) || slots < 1 || slots > 30) return { ok: false, error: "People needed should be between 1 and 30" };
  const repeat = Math.round(Number(b.repeatWeeks ?? 0)) || 0;
  if (repeat < 0 || repeat > 25) return { ok: false, error: "Repeat for up to 25 more weeks" };
  const location = String(b.location ?? "").trim().slice(0, 120);
  const notes = String(b.notes ?? "").trim().slice(0, 400);
  const fixtureId = String(b.fixtureId ?? "").trim().slice(0, 80);
  return {
    ok: true,
    value: { kind, label: custom || KIND_LABELS[kind], date, startTime, endTime, slots, ...(location ? { location } : {}), ...(notes ? { notes } : {}), ...(fixtureId ? { fixtureId } : {}) },
    dates: Array.from({ length: repeat + 1 }, (_, i) => addDays(date, i * 7)),
  };
}

export const shiftStartMs = (s: Pick<ShiftLike, "date" | "startTime">) => Date.parse(`${s.date}T${s.startTime}:00${OFFSET}`);
export const shiftEndMs = (s: Pick<ShiftLike, "date" | "endTime">) => Date.parse(`${s.date}T${s.endTime}:00${OFFSET}`);

/** Whether two shifts overlap in time. */
export const overlaps = (a: Pick<ShiftLike, "date" | "startTime" | "endTime">, b: Pick<ShiftLike, "date" | "startTime" | "endTime">) =>
  a.date === b.date && a.startTime < b.endTime && b.startTime < a.endTime;

/** Someone holds a place until they leave or someone takes it over, so a swap request still counts as filled. */
const holds = (s: SignupLike) => s.status === "confirmed" || s.status === "swap_requested";

export interface Fill { filled: number; free: number; needCover: number; full: boolean }
export function fill(slots: number, signups: SignupLike[]): Fill {
  const filled = signups.filter(holds).length;
  const needCover = signups.filter((s) => s.status === "swap_requested").length;
  return { filled, free: Math.max(0, slots - filled), needCover, full: filled >= slots };
}

export type Verdict = { ok: true } | { ok: false; reason: string };

/** Whether this member can take a place on this shift (a free place, or someone else's place that needs cover). */
export function canJoin(shift: ShiftLike, signups: SignupLike[], memberId: string, mine: ShiftLike[], now: Date, mode: "signup" | "takeover"): Verdict {
  if (shift.status !== "open") return { ok: false, reason: "This shift has been cancelled" };
  if (shiftStartMs(shift) <= now.getTime()) return { ok: false, reason: "This shift has already started" };
  if (signups.some((s) => s.memberId === memberId && holds(s))) return { ok: false, reason: "You're already on this shift" };
  const f = fill(shift.slots, signups);
  if (mode === "signup" && f.full) return { ok: false, reason: "This shift is full" };
  if (mode === "takeover" && f.needCover === 0) return { ok: false, reason: "Nobody needs cover on this shift" };
  const clash = mine.find((m) => m.shiftId !== shift.shiftId && m.status === "open" && overlaps(m, shift));
  if (clash) return { ok: false, reason: "That clashes with another shift you're on" };
  return { ok: true };
}

/** Whether a person may release their place. A swap request is only made before the shift starts. */
export const canRelease = (shift: ShiftLike, now: Date): Verdict =>
  shift.status !== "open" ? { ok: false, reason: "This shift has been cancelled" } : shiftStartMs(shift) <= now.getTime() ? { ok: false, reason: "This shift has already started" } : { ok: true };

const localHour = (now: Date) => new Date(now.getTime() + 10 * HOUR).getUTCHours();
export const isQuietHour = (now: Date) => { const h = localHour(now); return h < 7 || h >= 21; };

export type ReminderKind = "48h" | "eve";
/**
 * The reminder a volunteer is due, or null: one about two days ahead, and one the evening before (from 5pm).
 * Never overnight, never after the shift starts, never twice. Someone who signs up late gets only the evening-before one.
 */
export function dueShiftReminder(shift: ShiftLike, sent: string[] | undefined, now: Date): ReminderKind | null {
  if (shift.status !== "open" || isQuietHour(now)) return null;
  const start = shiftStartMs(shift), t = now.getTime();
  if (t >= start) return null;
  const done = new Set(sent ?? []);
  const eveFrom = Date.parse(`${addDays(shift.date, -1)}T17:00:00${OFFSET}`);
  if (t >= eveFrom && !done.has("eve")) return "eve";
  if (t >= start - 48 * HOUR && t < eveFrom && !done.has("48h")) return "48h";
  return null;
}

export const timeRange = (s: Pick<ShiftLike, "startTime" | "endTime">) => {
  const f = (t: string) => { const [h, m] = t.split(":").map(Number); const ap = h >= 12 ? "pm" : "am"; return `${h % 12 || 12}${m ? `:${String(m).padStart(2, "0")}` : ""}${ap}`; };
  return `${f(s.startTime)} to ${f(s.endTime)}`;
};
