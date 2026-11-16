// lib/access/guardians.ts
// Under-18s need a parent/guardian to approve a role before they can accept it.

import type { Db } from "mongodb";

export const MINOR_AGE = 18;
/** Highest matrix level an under-18 may hold (players, junior officials, general volunteers). */
export const MINOR_MAX_ROLE_LEVEL = 2;

export function isMinor(dateOfBirth: unknown, now: Date = new Date()): boolean {
  if (!dateOfBirth) return false;
  const dob = new Date(String(dateOfBirth));
  if (Number.isNaN(dob.getTime())) return false;
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
  return age < MINOR_AGE;
}

const GUARDIAN_REL = /\b(parent|guardian|mother|father|mum|mom|dad|carer|step-?(mother|father|parent))\b/i;

/** Linked members recorded as parent/guardian in the child's related people. */
export function guardianIdsFromRelated(related: unknown): string[] {
  if (!Array.isArray(related)) return [];
  return related
    .filter((r: any) => r?.memberId && GUARDIAN_REL.test(String(r?.relationshipType ?? "")))
    .map((r: any) => String(r.memberId));
}

/** Everyone who can approve for this member: linked parents/guardians and the family's primary contacts. */
export async function guardianIdsFor(db: Db, member: any): Promise<string[]> {
  const ids = new Set<string>(guardianIdsFromRelated(member?.personalInfo?.relatedMembers));
  const familyId = String(member?.family?.familyId ?? "").trim();
  if (familyId) {
    const primaries = await db
      .collection("members")
      .find({ "family.familyId": familyId, "family.isPrimaryContact": true }, { projection: { memberId: 1, personalInfo: 1 } })
      .toArray();
    for (const p of primaries) {
      // A primary contact who is themselves under 18 can't approve.
      if (p.memberId && p.memberId !== member.memberId && !isMinor(p.personalInfo?.dateOfBirth)) ids.add(String(p.memberId));
    }
  }
  ids.delete(String(member?.memberId ?? ""));
  return [...ids];
}
