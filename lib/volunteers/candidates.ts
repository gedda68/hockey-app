// lib/volunteers/candidates.ts — "you're on canteen on Saturday" as a notification. Pure.

import type { Candidate } from "@/lib/notifications/candidates";
import { shiftStartMs, timeRange, type ShiftLike } from "@/lib/volunteers/logic";

export interface MyShiftLike extends ShiftLike { signupId: string; label: string; clubId?: string; needsCover?: boolean }

export function shiftCandidates(rows: MyShiftLike[], now: Date, withinHours = 72): Candidate[] {
  const out: Candidate[] = [];
  for (const r of rows) {
    const start = shiftStartMs(r);
    if (r.status !== "open" || start <= now.getTime() || start > now.getTime() + withinHours * 3600_000) continue;
    const when = new Date(start).toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "short", timeZone: "Australia/Brisbane" });
    out.push({
      dedupeKey: `shift:${r.signupId}`, level: "club", category: "volunteering", type: "shift",
      title: `You're on ${r.label.toLowerCase()}: ${when}`,
      message: `${timeRange(r)}${r.needsCover ? ". You asked for cover and nobody has taken it yet." : ". Can't make it? Ask for cover."}`,
      link: "/admin/my-shifts", eventAt: new Date(start).toISOString(), expiresAt: new Date(shiftEndFor(r)).toISOString(),
      ...(r.clubId ? { clubId: r.clubId } : {}),
    });
  }
  return out;
}

const shiftEndFor = (r: ShiftLike) => Date.parse(`${r.date}T${r.endTime}:00+10:00`);
