// lib/volunteers/process.ts — hourly: reminds volunteers about their shifts. Safe to run repeatedly.

import type { Db } from "mongodb";
import { sendEmail } from "@/lib/email/client";
import { buildShiftReminderEmail } from "@/lib/email/templates/shiftReminder";
import { dueShiftReminder, timeRange, type ShiftLike } from "@/lib/volunteers/logic";
import { SHIFTS, SIGNUPS } from "@/lib/volunteers/access";

const dayText = (date: string) => new Date(`${date}T00:00:00+10:00`).toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", timeZone: "Australia/Brisbane" });

export async function processDueShifts(db: Db, now: Date = new Date(), budgetMs = 20_000): Promise<{ reminded: number }> {
  let reminded = 0;
  const started = Date.now();
  const from = new Date(now.getTime() - 86400000).toISOString().slice(0, 10);
  const to = new Date(now.getTime() + 4 * 86400000).toISOString().slice(0, 10);
  const shifts = await db.collection(SHIFTS).find({ status: "open", date: { $gte: from, $lte: to } }, { projection: { _id: 0 } }).limit(500).toArray();
  for (const s of shifts) {
    const signups = await db.collection(SIGNUPS).find({ shiftId: s.shiftId, status: { $in: ["confirmed", "swap_requested"] } }).limit(60).toArray();
    for (const su of signups) {
      if (Date.now() - started > budgetMs) return { reminded };
      const kind = dueShiftReminder(s as unknown as ShiftLike, su.remindersSent as string[] | undefined, now);
      if (!kind) continue;
      // Marked first so a failing address can't be retried every hour.
      await db.collection(SIGNUPS).updateOne({ signupId: su.signupId }, { $addToSet: { remindersSent: kind } });
      const m = await db.collection("members").findOne({ memberId: su.memberId }, { projection: { personalInfo: 1, firstName: 1, contact: 1, notificationPrefs: 1 } });
      const to_ = String(m?.contact?.primaryEmail ?? m?.contact?.email ?? "").trim();
      if (!to_ || m?.notificationPrefs?.enabled === false) continue;
      const mail = buildShiftReminderEmail({ name: String(m?.personalInfo?.firstName ?? m?.firstName ?? ""), clubName: String(s.clubName ?? "the club"), label: String(s.label), whenText: dayText(String(s.date)), timeText: timeRange(s as never), location: s.location as string | undefined, notes: s.notes as string | undefined, evening: kind === "eve" });
      if ((await sendEmail({ to: to_, ...mail })).success) reminded++;
    }
  }
  return { reminded };
}
