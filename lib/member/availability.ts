// lib/member/availability.ts
// Self-service availability: a person marks dates they can't (or can) be at matches, training or duties.

export type AvailabilityKind = "unavailable" | "available";

export interface AvailabilityInput { kind: AvailabilityKind; from: string; to: string; note?: string }

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const MAX_DAYS = 366;

const parse = (s: string): number | null => {
  if (!DAY.test(s)) return null;
  const t = Date.parse(`${s}T00:00:00Z`);
  return Number.isNaN(t) || new Date(t).toISOString().slice(0, 10) !== s ? null : t;
};

/** Validates a request body. `today` is YYYY-MM-DD in the person's day. */
export function cleanAvailability(
  body: unknown,
  today: string,
): { ok: true; value: AvailabilityInput } | { ok: false; error: string } {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const kind = b.kind === "available" ? "available" : b.kind === "unavailable" ? "unavailable" : null;
  if (!kind) return { ok: false, error: "Choose available or unavailable" };
  const from = String(b.from ?? "");
  const to = String(b.to ?? b.from ?? "");
  const f = parse(from);
  const t = parse(to);
  if (f === null || t === null) return { ok: false, error: "Use dates like 2026-03-14" };
  if (t < f) return { ok: false, error: "The end date is before the start date" };
  if (t < (parse(today) as number)) return { ok: false, error: "That period has already finished" };
  if ((t - f) / 86400000 + 1 > MAX_DAYS) return { ok: false, error: "Pick a period of a year or less" };
  const note = String(b.note ?? "").trim().slice(0, 200);
  return { ok: true, value: { kind, from, to, ...(note ? { note } : {}) } };
}

/** Whether a given day (YYYY-MM-DD) falls inside an entry. */
export const coversDay = (e: { from: string; to: string }, day: string) => day >= e.from && day <= e.to;

// ── Days in the app's time zone ───────────────────────────────────────────────

/** Availability dates are calendar days in this zone (the association's playing zone). */
export const APP_TIME_ZONE = "Australia/Brisbane";

/** YYYY-MM-DD for an instant, in the app's time zone. Null when the value isn't a date. */
export function dayInZone(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-CA", { timeZone: APP_TIME_ZONE });
}

export const todayInZone = (now: Date = new Date()) => dayInZone(now) as string;

export interface UnavailableEntry { from: string; to: string; note?: string }
