// lib/volunteers/cover.ts
// When a volunteer asks for cover: email whoever set the shift up, and nudge a few people who have done that job
// before. Runs from the hourly job, so it waits for daytime and only ever acts once per request.

import type { Db } from "mongodb";
import { sendEmail } from "@/lib/email/client";
import { buildCoverCoordinatorEmail, buildCoverNudgeEmail, type CoverOptions } from "@/lib/email/templates/shiftCover";
import { isQuietHour, overlaps, shiftStartMs, timeRange, type ShiftLike } from "@/lib/volunteers/logic";
import { SHIFTS, SIGNUPS } from "@/lib/volunteers/access";

export const MAX_NUDGES = 8;

/** People ranked by how often they've done this kind of job, most experienced first. Pure. */
export function rankHelpers(history: { memberId: string }[], exclude: Set<string>, limit = MAX_NUDGES): string[] {
  const n = new Map<string, number>();
  for (const h of history) if (!exclude.has(h.memberId)) n.set(h.memberId, (n.get(h.memberId) ?? 0) + 1);
  return [...n].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, limit).map(([id]) => id);
}

const dayText = (date: string) => new Date(`${date}T00:00:00+10:00`).toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", timeZone: "Australia/Brisbane" });
const emailOf = (m: any) => (m?.notificationPrefs?.enabled === false ? "" : String(m?.contact?.primaryEmail ?? m?.contact?.email ?? "").trim());
const firstOf = (m: any) => String(m?.personalInfo?.firstName ?? m?.firstName ?? "").trim();

export async function processCoverRequests(db: Db, now: Date = new Date(), budgetMs = 15_000): Promise<{ requests: number; emailed: number }> {
  const out = { requests: 0, emailed: 0 };
  if (isQuietHour(now)) return out;
  const started = Date.now();
  const pending = await db.collection(SIGNUPS).find({ status: "swap_requested", coverNotifiedAt: { $exists: false } }).limit(50).toArray();
  for (const su of pending) {
    if (Date.now() - started > budgetMs) break;
    const shift = (await db.collection(SHIFTS).findOne({ shiftId: su.shiftId, status: "open" }, { projection: { _id: 0 } })) as (ShiftLike & Record<string, any>) | null;
    // Marked first so a failing address can't repeat the emails every hour.
    await db.collection(SIGNUPS).updateOne({ signupId: su.signupId }, { $set: { coverNotifiedAt: now.toISOString() } });
    if (!shift || shiftStartMs(shift) <= now.getTime()) continue;
    out.requests++;
    const base: CoverOptions = { name: "", clubName: String(shift.clubName ?? "the club"), label: String(shift.label), whenText: dayText(shift.date), timeText: timeRange(shift), location: shift.location, volunteer: String(su.name ?? "A volunteer") };

    const owner = shift.createdBy ? await db.collection("members").findOne({ memberId: shift.createdBy }, { projection: { personalInfo: 1, firstName: 1, contact: 1, notificationPrefs: 1 } }) : null;
    if (emailOf(owner) && (await sendEmail({ to: emailOf(owner), ...buildCoverCoordinatorEmail({ ...base, name: firstOf(owner) }) })).success) out.emailed++;

    const onIt = new Set((await db.collection(SIGNUPS).find({ shiftId: shift.shiftId, status: { $in: ["confirmed", "swap_requested"] } }, { projection: { memberId: 1 } }).toArray()).map((s) => String(s.memberId)));
    const sameKind = (await db.collection(SHIFTS).find({ clubId: shift.clubId, kind: shift.kind, date: { $lt: shift.date } }, { projection: { shiftId: 1 } }).limit(500).toArray()).map((s) => String(s.shiftId));
    if (!sameKind.length) continue;
    const history = await db.collection(SIGNUPS).find({ shiftId: { $in: sameKind }, status: { $in: ["confirmed", "swapped"] } }, { projection: { memberId: 1 } }).limit(2000).toArray();
    const candidates = rankHelpers(history.map((h) => ({ memberId: String(h.memberId) })), onIt, 30);
    let sent = 0;
    for (const id of candidates) {
      if (sent >= MAX_NUDGES || Date.now() - started > budgetMs) break;
      // Skip anyone already on something at that time.
      const theirs = await db.collection(SIGNUPS).find({ memberId: id, status: { $in: ["confirmed", "swap_requested"] } }, { projection: { shiftId: 1 } }).limit(100).toArray();
      const clash = theirs.length ? await db.collection(SHIFTS).find({ shiftId: { $in: theirs.map((t) => String(t.shiftId)) }, date: shift.date, status: "open" }, { projection: { date: 1, startTime: 1, endTime: 1 } }).toArray() : [];
      if (clash.some((c) => overlaps(c as never, shift))) continue;
      const m = await db.collection("members").findOne({ memberId: id }, { projection: { personalInfo: 1, firstName: 1, contact: 1, notificationPrefs: 1 } });
      if (!emailOf(m)) continue;
      if ((await sendEmail({ to: emailOf(m), ...buildCoverNudgeEmail({ ...base, name: firstOf(m) }) })).success) { sent++; out.emailed++; }
    }
  }
  return out;
}
