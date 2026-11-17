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

// ── Role requests (legacy roles) ──────────────────────────────────────────────

/** Roles an under-18 may request: playing, junior officiating and general volunteering. */
export const MINOR_ALLOWED_LEGACY_ROLES: ReadonlySet<string> = new Set(["player", "member", "volunteer", "umpire", "technical-official"]);

export interface GuardianApproval {
  status: "pending" | "approved" | "refused";
  guardianIds: string[];
  decidedBy?: string;
  decidedByName?: string;
  decidedAt?: string;
}

export type GuardianCheck =
  | { required: false }
  | { required: true; ok: false; status: number; error: string }
  | { required: true; ok: true; approval: GuardianApproval };

/**
 * What a role request for this member needs. Adults: nothing. Under-18s: only junior-appropriate roles, and a
 * parent/guardian must approve. A parent/guardian who submits the request themselves approves it as they go.
 */
export async function guardianCheckForRequest(
  db: Db,
  target: any,
  role: string,
  submitter?: { memberId?: string | null; name?: string | null },
  now: Date = new Date(),
): Promise<GuardianCheck> {
  if (!isMinor(target?.personalInfo?.dateOfBirth, now)) return { required: false };
  if (!MINOR_ALLOWED_LEGACY_ROLES.has(role)) {
    return { required: true, ok: false, status: 400, error: "Under-18s can only request playing, junior official and volunteer roles." };
  }
  const guardianIds = await guardianIdsFor(db, target);
  if (guardianIds.length === 0) {
    return { required: true, ok: false, status: 400, error: "They're under 18 and have no parent/guardian linked on their record. Link a guardian first." };
  }
  const me = submitter?.memberId ? String(submitter.memberId) : "";
  if (me && guardianIds.includes(me)) {
    return { required: true, ok: true, approval: { status: "approved", guardianIds, decidedBy: me, decidedByName: submitter?.name ?? undefined, decidedAt: now.toISOString() } };
  }
  return { required: true, ok: true, approval: { status: "pending", guardianIds } };
}

// ── Children (reverse lookup) ─────────────────────────────────────────────────

/** Members I am a recorded parent/guardian of (linked on their record, or primary contact of their family). */
export async function childrenOf(db: Db, guardianMemberId: string): Promise<any[]> {
  const me = String(guardianMemberId ?? "").trim();
  if (!me) return [];
  const proj = { memberId: 1, personalInfo: 1, family: 1, clubId: 1, "membership.clubId": 1, "membership.status": 1, roleHoldings: 1 };
  const candidates = new Map<string, any>();
  const linked = await db.collection("members").find({ "personalInfo.relatedMembers.memberId": me }, { projection: proj }).toArray();
  for (const c of linked) candidates.set(String(c.memberId), c);
  const mine = await db.collection("members").findOne({ memberId: me }, { projection: { family: 1 } });
  const familyId = String((mine as any)?.family?.familyId ?? "").trim();
  if (familyId && (mine as any)?.family?.isPrimaryContact) {
    const fam = await db.collection("members").find({ "family.familyId": familyId }, { projection: proj }).toArray();
    for (const c of fam) candidates.set(String(c.memberId), c);
  }
  candidates.delete(me);
  const out: any[] = [];
  for (const c of candidates.values()) {
    if ((await guardianIdsFor(db, c)).includes(me)) out.push(c);
  }
  return out;
}
