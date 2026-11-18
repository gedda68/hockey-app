// lib/calendar/service.ts — calendar links: who can have one, creating, changing, replacing and stopping them, and serving the feed.

import { randomBytes } from "node:crypto";
import type { Db } from "mongodb";
import { childrenOf, guardianIdsFor } from "@/lib/access/guardians";
import { buildCalendar, tokenFromSegment } from "@/lib/calendar/ics";
import { DEFAULT_INCLUDES, calendarItems, cleanIncludes, type Includes } from "@/lib/calendar/items";

export const FEEDS = "calendar_feeds";
const newToken = () => randomBytes(24).toString("base64url");
const nameOf = (m: any) => `${m?.personalInfo?.firstName ?? m?.firstName ?? ""} ${m?.personalInfo?.lastName ?? m?.lastName ?? ""}`.trim() || "Member";
const firstOf = (m: any) => String(m?.personalInfo?.firstName ?? m?.firstName ?? "").trim();

/** Whose calendar can this person have a link for: their own, and their children's. */
export async function subjectsFor(db: Db, ownerId: string) {
  const me: any = await db.collection("members").findOne({ memberId: ownerId }, { projection: { memberId: 1, personalInfo: 1, firstName: 1, lastName: 1 } });
  if (!me) return [];
  const kids = await childrenOf(db, ownerId).catch(() => [] as any[]);
  return [{ memberId: ownerId, name: nameOf(me), isMe: true }, ...kids.map((k: any) => ({ memberId: String(k.memberId), name: nameOf(k), isMe: false }))];
}

async function allowed(db: Db, ownerId: string, subjectId: string): Promise<boolean> {
  if (ownerId === subjectId) return !!(await db.collection("members").findOne({ memberId: ownerId }, { projection: { memberId: 1 } }));
  const subject: any = await db.collection("members").findOne({ memberId: subjectId }, { projection: { memberId: 1, personalInfo: 1, family: 1 } });
  return !!subject && (await guardianIdsFor(db, subject).catch(() => [] as string[])).includes(ownerId);
}

export interface Feed { token: string; ownerId: string; subjectId: string; includes: Includes; createdAt: string; lastFetchedAt?: string | null; fetchCount?: number; revokedAt?: string | null }

export async function listFeeds(db: Db, ownerId: string): Promise<Feed[]> {
  return (await db.collection(FEEDS).find({ ownerId, revokedAt: null }, { projection: { _id: 0 } }).limit(50).toArray()) as unknown as Feed[];
}

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string; status: number };

/** One live link per person and calendar; asking again returns the same one. */
export async function createFeed(db: Db, ownerId: string, subjectId: string, includes?: unknown, now: Date = new Date()): Promise<Result<{ feed: Feed }>> {
  if (!(await allowed(db, ownerId, subjectId))) return { ok: false, error: "You can only make calendar links for yourself and your children", status: 403 };
  const existing = (await db.collection(FEEDS).findOne({ ownerId, subjectId, revokedAt: null }, { projection: { _id: 0 } })) as unknown as Feed | null;
  if (existing) return { ok: true, feed: existing };
  const feed: Feed = { token: newToken(), ownerId, subjectId, includes: cleanIncludes(includes, ownerId === subjectId ? DEFAULT_INCLUDES : { ...DEFAULT_INCLUDES, events: false }), createdAt: now.toISOString(), lastFetchedAt: null, fetchCount: 0, revokedAt: null };
  await db.collection(FEEDS).insertOne({ ...feed });
  return { ok: true, feed };
}

const mine = async (db: Db, ownerId: string, subjectId: string) => (await db.collection(FEEDS).findOne({ ownerId, subjectId, revokedAt: null }, { projection: { _id: 0 } })) as unknown as Feed | null;

/** Replaces the link, so the old one stops working (if it has been shared by mistake). */
export async function rotateFeed(db: Db, ownerId: string, subjectId: string): Promise<Result<{ feed: Feed }>> {
  const cur = await mine(db, ownerId, subjectId);
  if (!cur) return { ok: false, error: "No calendar link to replace", status: 404 };
  const token = newToken();
  await db.collection(FEEDS).updateOne({ token: cur.token }, { $set: { token } });
  return { ok: true, feed: { ...cur, token } };
}
export async function revokeFeed(db: Db, ownerId: string, subjectId: string, now: Date = new Date()): Promise<Result> {
  const cur = await mine(db, ownerId, subjectId);
  if (!cur) return { ok: false, error: "No calendar link", status: 404 };
  await db.collection(FEEDS).updateOne({ token: cur.token }, { $set: { revokedAt: now.toISOString() } });
  return { ok: true };
}
export async function setIncludes(db: Db, ownerId: string, subjectId: string, includes: unknown): Promise<Result<{ feed: Feed }>> {
  const cur = await mine(db, ownerId, subjectId);
  if (!cur) return { ok: false, error: "No calendar link", status: 404 };
  const next = cleanIncludes(includes, cur.includes);
  await db.collection(FEEDS).updateOne({ token: cur.token }, { $set: { includes: next } });
  return { ok: true, feed: { ...cur, includes: next } };
}

/** The calendar behind a link: nothing for a link that is unknown, stopped, or no longer allowed (a parent who is no longer linked to the child). */
export async function renderFeed(db: Db, segment: string, o: { now?: Date; origin?: string } = {}): Promise<string | null> {
  const token = tokenFromSegment(segment);
  if (!token) return null;
  const now = o.now ?? new Date();
  const feed = (await db.collection(FEEDS).findOne({ token, revokedAt: null }, { projection: { _id: 0 } })) as unknown as Feed | null;
  if (!feed || !(await allowed(db, feed.ownerId, feed.subjectId))) return null;
  const subject: any = await db.collection("members").findOne({ memberId: feed.subjectId }, { projection: { personalInfo: 1, firstName: 1, lastName: 1 } });
  const own = feed.ownerId === feed.subjectId;
  const items = await calendarItems(db, feed.subjectId, { includes: feed.includes, now, origin: o.origin, prefix: own ? undefined : firstOf(subject) });
  await db.collection(FEEDS).updateOne({ token }, { $set: { lastFetchedAt: now.toISOString() }, $inc: { fetchCount: 1 } }).catch(() => {});
  return buildCalendar({ name: own ? "My hockey" : `${firstOf(subject) || "Hockey"}'s hockey`, items, now, description: "Matches, training and duties from your hockey club" });
}
