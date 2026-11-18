// lib/rsvp/lineup.ts
// Squad answers shown where the coach picks the match-day lineup. The database lookup is thin; the rest is pure.

import type { Db } from "mongodb";
import type { RsvpAnswer } from "@/lib/rsvp/logic";
import { INVITES, REQUESTS } from "@/lib/rsvp/access";

export interface LineupRsvp { requestId: string; answers: Record<string, { answer: RsvpAnswer | null; note?: string }> }

/** The latest "can you play?" request for this team and match (by fixture, else by team and match day), with each player's answer. */
export async function rsvpForFixture(db: Db, q: { fixtureId: string; teamId: string; matchDay: string | null }): Promise<LineupRsvp | null> {
  const or: Record<string, unknown>[] = [{ fixtureId: q.fixtureId }];
  if (q.matchDay) or.push({ matchDate: q.matchDay });
  const req = await db.collection(REQUESTS).find({ teamId: q.teamId, $or: or }, { projection: { requestId: 1 } }).sort({ createdAt: -1 }).limit(1).next();
  if (!req) return null;
  const invites = await db.collection(INVITES).find({ requestId: req.requestId }, { projection: { playerId: 1, response: 1, note: 1 } }).limit(500).toArray();
  const answers: LineupRsvp["answers"] = {};
  for (const i of invites) answers[String(i.playerId)] = { answer: (i.response as RsvpAnswer) ?? null, ...(i.note ? { note: String(i.note) } : {}) };
  return { requestId: String(req.requestId), answers };
}

export interface LineupCounts { in: number; maybe: number; out: number; none: number }
export function countAnswers(answers: LineupRsvp["answers"]): LineupCounts {
  const c: LineupCounts = { in: 0, maybe: 0, out: 0, none: 0 };
  for (const a of Object.values(answers)) c[a.answer ?? "none"]++;
  return c;
}

/** Players who said they're in and aren't in the lineup yet. */
export const inNotYetSelected = (answers: LineupRsvp["answers"], selected: Iterable<string>): string[] => {
  const have = new Set(selected);
  return Object.entries(answers).filter(([id, a]) => a.answer === "in" && !have.has(id)).map(([id]) => id);
};

/** Picked for the lineup but said they can't make it. */
export const pickedButOut = (answers: LineupRsvp["answers"], selected: Iterable<string>): string[] =>
  [...selected].filter((id) => answers[id]?.answer === "out");
