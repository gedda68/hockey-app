// lib/member/availabilityLookup.ts
// What allocators and selectors see: who has marked themselves unavailable.

import type { Db } from "mongodb";
import { memberBelongsToClubFilter } from "@/lib/rosters/memberClubQuery";
import type { UnavailableEntry } from "@/lib/member/availability";

const COL = "member_availability";
const proj = { _id: 0, memberId: 1, from: 1, to: 1, note: 1 } as const;
const pick = (r: any): UnavailableEntry => ({ from: r.from, to: r.to, ...(r.note ? { note: r.note } : {}) });

/** Of these people, who has marked themselves unavailable on this day (YYYY-MM-DD). */
export async function unavailableOnDay(db: Db, memberIds: string[], day: string | null): Promise<Map<string, UnavailableEntry>> {
  const out = new Map<string, UnavailableEntry>();
  const ids = [...new Set(memberIds.filter(Boolean))];
  if (!day || !ids.length) return out;
  const rows = await db.collection(COL).find({ memberId: { $in: ids }, kind: "unavailable", from: { $lte: day }, to: { $gte: day } }, { projection: proj }).toArray();
  for (const r of rows) if (!out.has(r.memberId)) out.set(r.memberId, pick(r));
  return out;
}

/** Everyone in this club who has marked themselves unavailable on this day. */
export async function unavailableForClubOnDay(db: Db, clubId: string, day: string | null): Promise<Record<string, UnavailableEntry>> {
  if (!day || !clubId) return {};
  const rows = await db.collection(COL).find({ kind: "unavailable", from: { $lte: day }, to: { $gte: day } }, { projection: proj }).toArray();
  if (!rows.length) return {};
  const members = await db
    .collection("members")
    .find({ memberId: { $in: [...new Set(rows.map((r) => r.memberId))] }, ...memberBelongsToClubFilter(clubId) }, { projection: { memberId: 1 } })
    .toArray();
  const inClub = new Set(members.map((m) => m.memberId as string));
  const out: Record<string, UnavailableEntry> = {};
  for (const r of rows) if (inClub.has(r.memberId) && !out[r.memberId]) out[r.memberId] = pick(r);
  return out;
}

/** Upcoming unavailable periods (not yet finished, starting within `withinDays`) per person. */
export async function upcomingUnavailability(db: Db, memberIds: string[], today: string, withinDays = 120): Promise<Map<string, UnavailableEntry[]>> {
  const out = new Map<string, UnavailableEntry[]>();
  const ids = [...new Set(memberIds.filter(Boolean))];
  if (!ids.length) return out;
  const limit = new Date(Date.parse(`${today}T00:00:00Z`) + withinDays * 86400000).toISOString().slice(0, 10);
  const rows = await db
    .collection(COL)
    .find({ memberId: { $in: ids }, kind: "unavailable", to: { $gte: today }, from: { $lte: limit } }, { projection: proj })
    .sort({ from: 1 })
    .toArray();
  for (const r of rows) out.set(r.memberId, [...(out.get(r.memberId) ?? []), pick(r)]);
  return out;
}
