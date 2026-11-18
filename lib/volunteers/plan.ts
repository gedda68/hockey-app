// lib/volunteers/plan.ts
// Working out volunteer shifts from a club's home matches. Pure.
//   Ground set-up: an hour before the first match of the day, until it starts.
//   Canteen: from half an hour before the first match until the last one has finished.
//   Scoring: one shift per match, from a few minutes before the start until it has finished.

import type { ShiftKind } from "@/lib/volunteers/logic";

export interface HomeFixture { fixtureId: string; startsAt: string; venue?: string; label?: string }
export interface PlanTemplate { kind: Exclude<ShiftKind, "other">; enabled: boolean; slots: number }
export interface PlannedShift { autoKey: string; kind: ShiftKind; label: string; date: string; startTime: string; endTime: string; slots: number; location?: string; notes?: string; fixtureId?: string }

/** How long a match is assumed to take, start to final whistle plus a little. */
export const MATCH_MINUTES = 80;
const OFFSET_MS = 10 * 3600_000; // Australia/Brisbane has no daylight saving

const local = (iso: string) => new Date(Date.parse(iso) + OFFSET_MS);
export const dayOf = (iso: string) => local(iso).toISOString().slice(0, 10);
const minutesOf = (iso: string) => { const d = local(iso); return d.getUTCHours() * 60 + d.getUTCMinutes(); };
export const hhmm = (mins: number) => { const m = Math.max(0, Math.min(23 * 60 + 59, mins)); return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`; };

export function planShifts(fixtures: HomeFixture[], templates: PlanTemplate[]): PlannedShift[] {
  const on = (k: PlanTemplate["kind"]) => templates.find((t) => t.kind === k && t.enabled);
  const byDay = new Map<string, HomeFixture[]>();
  for (const f of fixtures) { if (Number.isNaN(Date.parse(f.startsAt))) continue; const d = dayOf(f.startsAt); byDay.set(d, [...(byDay.get(d) ?? []), f]); }
  const out: PlannedShift[] = [];
  for (const [date, list] of [...byDay].sort(([a], [b]) => a.localeCompare(b))) {
    list.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    const first = minutesOf(list[0].startsAt), last = minutesOf(list[list.length - 1].startsAt);
    const venues = [...new Set(list.map((f) => f.venue).filter(Boolean))] as string[];
    const location = venues.length === 1 ? venues[0] : undefined;
    const setup = on("ground_setup"), canteen = on("canteen"), scoring = on("scoring");
    if (setup) out.push({ autoKey: `auto:ground_setup:${date}`, kind: "ground_setup", label: "Ground set-up", date, startTime: hhmm(first - 60), endTime: hhmm(first), slots: setup.slots, ...(location ? { location } : {}) });
    if (canteen) out.push({ autoKey: `auto:canteen:${date}`, kind: "canteen", label: "Canteen", date, startTime: hhmm(first - 30), endTime: hhmm(Math.min(last + MATCH_MINUTES, 23 * 60 + 59)), slots: canteen.slots, ...(location ? { location } : {}) });
    if (scoring) for (const f of list) out.push({ autoKey: `auto:scoring:${f.fixtureId}`, kind: "scoring", label: "Scoring", date, startTime: hhmm(minutesOf(f.startsAt) - 10), endTime: hhmm(Math.min(minutesOf(f.startsAt) + MATCH_MINUTES, 23 * 60 + 59)), slots: scoring.slots, ...(f.venue ? { location: f.venue } : {}), ...(f.label ? { notes: f.label } : {}), fixtureId: f.fixtureId });
  }
  return out;
}
