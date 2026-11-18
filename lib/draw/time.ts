// lib/draw/time.ts — small date helpers for the draw. Brisbane has no daylight saving, so a fixed offset is enough; pass another for other places.

export const DEFAULT_OFFSET = "+10:00";
const DAY = /^\d{4}-\d{2}-\d{2}$/;

export const isDay = (s: unknown): s is string => typeof s === "string" && DAY.test(s) && new Date(`${s}T00:00:00Z`).toISOString().slice(0, 10) === s;
export const isClock = (s: unknown): s is string => typeof s === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(s);

export function addDays(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
/** "2026-03-14" + "08:30" in an offset such as "+10:00" -> milliseconds. */
export const at = (day: string, clock: string, offset = DEFAULT_OFFSET) => Date.parse(`${day}T${clock}:00${offset}`);

/** The local calendar day (YYYY-MM-DD) of a moment at this offset. */
export function dayOf(ms: number, offset = DEFAULT_OFFSET): string {
  const m = /^([+-])(\d\d):(\d\d)$/.exec(offset);
  const mins = m ? (m[1] === "-" ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3])) : 600;
  return new Date(ms + mins * 60_000).toISOString().slice(0, 10);
}
