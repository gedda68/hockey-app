// lib/volunteers/service.ts — the actions on a shift's places (sign up, leave, ask for cover, take over, assign). Shared by the member and coordinator routes.

import { randomBytes } from "node:crypto";
import type { Db } from "mongodb";
import { SHIFTS, SIGNUPS } from "@/lib/volunteers/access";
import { canJoin, canRelease, shiftStartMs, type ShiftLike } from "@/lib/volunteers/logic";

export const newId = (p: string) => `${p}-${Date.now().toString(36)}-${randomBytes(3).toString("hex")}`;
export type Result = { ok: true; message: string } | { ok: false; status: number; error: string };
const fail = (status: number, error: string): Result => ({ ok: false, status, error });

const HOLDING = ["confirmed", "swap_requested"];
const nameOf = (m: any) => `${m?.personalInfo?.firstName ?? m?.firstName ?? ""} ${m?.personalInfo?.lastName ?? m?.lastName ?? ""}`.trim();

export async function memberName(db: Db, memberId: string): Promise<string> {
  return nameOf(await db.collection("members").findOne({ memberId }, { projection: { personalInfo: 1, firstName: 1, lastName: 1 } })) || memberId;
}

async function myShifts(db: Db, memberId: string): Promise<ShiftLike[]> {
  const ids = (await db.collection(SIGNUPS).find({ memberId, status: { $in: HOLDING } }, { projection: { shiftId: 1 } }).limit(200).toArray()).map((s) => String(s.shiftId));
  return ids.length ? ((await db.collection(SHIFTS).find({ shiftId: { $in: ids } }, { projection: { _id: 0 } }).toArray()) as unknown as ShiftLike[]) : [];
}

/** Take a free place, or (mode "takeover") take over someone's place that needs cover. */
export async function join(db: Db, shiftId: string, memberId: string, mode: "signup" | "takeover", now: Date = new Date(), by?: string): Promise<Result> {
  const shift = (await db.collection(SHIFTS).findOne({ shiftId }, { projection: { _id: 0 } })) as (ShiftLike & { clubId: string }) | null;
  if (!shift) return fail(404, "Shift not found");
  const signups = await db.collection(SIGNUPS).find({ shiftId }).toArray();
  const v = canJoin(shift, signups as never, memberId, await myShifts(db, memberId), now, mode);
  if (!v.ok) return fail(409, v.reason);
  const name = await memberName(db, memberId);
  const doc = { signupId: newId("VS"), shiftId, clubId: shift.clubId, memberId, name, status: "confirmed", remindersSent: [] as string[], createdAt: now.toISOString(), ...(by ? { assignedBy: by } : {}) };
  if (mode === "takeover") {
    const covered = await db.collection(SIGNUPS).findOneAndUpdate({ shiftId, status: "swap_requested" }, { $set: { status: "swapped", swappedTo: memberId, swappedAt: now.toISOString() } }, { sort: { swapRequestedAt: 1 } });
    if (!covered) return fail(409, "Someone else has just taken that place");
    await db.collection(SIGNUPS).insertOne({ ...doc, tookOverFrom: covered.memberId });
    return { ok: true, message: "You've taken over the shift. Thank you!" };
  }
  await db.collection(SIGNUPS).insertOne({ ...doc });
  // Two people grabbing the last place at once: whoever signed up later steps back.
  const held = await db.collection(SIGNUPS).find({ shiftId, status: { $in: HOLDING } }, { projection: { signupId: 1 } }).sort({ createdAt: 1, signupId: 1 }).toArray();
  if (held.length > shift.slots && held.slice(shift.slots).some((h) => h.signupId === doc.signupId)) {
    await db.collection(SIGNUPS).deleteOne({ signupId: doc.signupId });
    return fail(409, "This shift has just filled up");
  }
  return { ok: true, message: "You're on the shift. Thank you!" };
}

/** Leave a shift. More than two days out the place is simply released; closer in, it stays yours until someone takes it over. */
export async function release(db: Db, shiftId: string, memberId: string, now: Date = new Date(), forceSwap = false): Promise<Result> {
  const shift = (await db.collection(SHIFTS).findOne({ shiftId }, { projection: { _id: 0 } })) as ShiftLike | null;
  const su = await db.collection(SIGNUPS).findOne({ shiftId, memberId, status: { $in: HOLDING } });
  if (!shift || !su) return fail(404, "You're not on that shift");
  const v = canRelease(shift, now);
  if (!v.ok) return fail(409, v.reason);
  const early = shiftStartMs(shift) - now.getTime() > 48 * 3600_000;
  if (early && !forceSwap) {
    await db.collection(SIGNUPS).updateOne({ signupId: su.signupId }, { $set: { status: "cancelled", cancelledAt: now.toISOString() } });
    return { ok: true, message: "You've been taken off the shift. Thanks for letting us know." };
  }
  await db.collection(SIGNUPS).updateOne({ signupId: su.signupId }, { $set: { status: "swap_requested", swapRequestedAt: now.toISOString() } });
  return { ok: true, message: "Cover requested. You stay on the shift until someone takes it over." };
}

export async function keepShift(db: Db, shiftId: string, memberId: string): Promise<Result> {
  const r = await db.collection(SIGNUPS).updateOne({ shiftId, memberId, status: "swap_requested" }, { $set: { status: "confirmed" }, $unset: { swapRequestedAt: "" } });
  return r.matchedCount ? { ok: true, message: "Good. You're still on the shift." } : fail(404, "No cover request to cancel");
}
