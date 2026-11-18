// lib/rsvp/respond.ts
// Answering "can you play?". Works for a signed-in person (by member id) and for the private link in the email (by token).

import type { Db } from "mongodb";
import { ANSWERS, matchStartMs, type RsvpAnswer } from "@/lib/rsvp/logic";
import { INVITES, REQUESTS } from "@/lib/rsvp/access";

export type AnswerResult = { ok: true; answer: RsvpAnswer } | { ok: false; status: number; error: string };

export async function answerInvite(db: Db, inviteFilter: Record<string, unknown>, raw: { answer?: unknown; note?: unknown }, by: string, now: Date = new Date()): Promise<AnswerResult> {
  const answer = ANSWERS.find((a) => a === raw.answer);
  if (!answer) return { ok: false, status: 400, error: "Choose in, maybe or out" };
  const inv = await db.collection(INVITES).findOne(inviteFilter);
  if (!inv) return { ok: false, status: 404, error: "This request isn't valid any more" };
  const req = await db.collection(REQUESTS).findOne({ requestId: inv.requestId }, { projection: { status: 1, matchDate: 1, startsAt: 1 } });
  if (!req || req.status !== "open" || now.getTime() >= matchStartMs({ matchDate: String(req.matchDate), startsAt: (req.startsAt as string) ?? null })) {
    return { ok: false, status: 410, error: "This match is no longer taking answers" };
  }
  const note = String(raw.note ?? "").trim().slice(0, 200);
  await db.collection(INVITES).updateOne(
    { inviteId: inv.inviteId },
    { $set: { status: "answered", response: answer, note: note || null, respondedAt: now.toISOString(), respondedBy: by } },
  );
  return { ok: true, answer };
}

/** What a person (or the link) sees for one request. */
export async function describeInvite(db: Db, inviteFilter: Record<string, unknown>) {
  const inv = await db.collection(INVITES).findOne(inviteFilter, { projection: { _id: 0, token: 0 } });
  if (!inv) return null;
  const req = await db.collection(REQUESTS).findOne({ requestId: inv.requestId }, { projection: { _id: 0 } });
  if (!req) return null;
  const closed = req.status !== "open" || Date.now() >= matchStartMs({ matchDate: String(req.matchDate), startsAt: (req.startsAt as string) ?? null });
  return {
    inviteId: String(inv.inviteId),
    requestId: String(req.requestId),
    title: String(req.title),
    teamName: String(req.teamName ?? ""),
    matchDate: String(req.matchDate),
    startsAt: (req.startsAt as string) ?? null,
    venue: (req.venue as string) ?? "",
    note: (req.note as string) ?? "",
    playerName: String(inv.playerName ?? ""),
    forChild: !!inv.parentView,
    answer: (inv.response as RsvpAnswer) ?? null,
    answerNote: (inv.note as string) ?? "",
    closed,
  };
}
