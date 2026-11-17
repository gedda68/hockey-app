// lib/access/legacySync.ts
// Database helpers that keep members.roleHoldings in step with legacy role grants.

import type { ClientSession, Db } from "mongodb";
import type { RoleHolding } from "@/lib/access/matrix";
import { planMemberHoldings, planHoldingEnds, type LegacyAssignment, type LegacyContext } from "@/lib/access/legacyMapping";

/** Club that owns each team id (one query). */
export async function teamClubLookup(db: Db, teamIds: string[], session?: ClientSession): Promise<Map<string, string>> {
  const ids = [...new Set(teamIds.filter(Boolean))];
  const map = new Map<string, string>();
  if (!ids.length) return map;
  const rows = await db
    .collection("teams")
    .find({ teamId: { $in: ids } }, { projection: { teamId: 1, clubId: 1 }, ...(session ? { session } : {}) })
    .toArray();
  for (const t of rows) if (t.teamId && t.clubId) map.set(String(t.teamId), String(t.clubId));
  return map;
}

export const contextFromTeams = (teamClub: Map<string, string>) => (a: LegacyAssignment): LegacyContext =>
  a.scopeType === "team" && a.scopeId ? { teamClubId: teamClub.get(a.scopeId) } : {};

/**
 * After a legacy role is granted to a member, add the matching matrix holding (if there is one and the member
 * does not already hold it). Safe to call repeatedly. Returns how many holdings were added.
 */
export async function syncMatrixHoldingsForGrant(
  db: Db,
  memberId: string,
  assignments: LegacyAssignment[],
  session?: ClientSession,
): Promise<number> {
  if (!assignments.length) return 0;
  const member = await db
    .collection("members")
    .findOne({ memberId }, { projection: { roleHoldings: 1 }, ...(session ? { session } : {}) });
  if (!member) return 0;
  const teamClub = await teamClubLookup(db, assignments.filter((a) => a.scopeType === "team").map((a) => a.scopeId ?? ""), session);
  const plan = planMemberHoldings(
    assignments,
    Array.isArray(member.roleHoldings) ? (member.roleHoldings as RoleHolding[]) : [],
    contextFromTeams(teamClub),
  );
  if (!plan.add.length) return 0;
  await db
    .collection("members")
    .updateOne({ memberId }, { $push: { roleHoldings: { $each: plan.add } } as never, $inc: { roleVersion: 1 } }, session ? { session } : undefined);
  return plan.add.length;
}

/**
 * After legacy roles are ended or removed, end the matrix holdings that were created from them, so the person
 * doesn't keep the access. Returns how many holdings were ended.
 */
export async function syncMatrixHoldingsForRemoval(
  db: Db,
  memberId: string,
  before: LegacyAssignment[],
  after: LegacyAssignment[],
  endedBy: string,
  session?: ClientSession,
): Promise<number> {
  if (!before.length) return 0;
  const member = await db
    .collection("members")
    .findOne({ memberId }, { projection: { roleHoldings: 1 }, ...(session ? { session } : {}) });
  const holdings = Array.isArray(member?.roleHoldings) ? (member!.roleHoldings as RoleHolding[]) : [];
  if (!holdings.length) return 0;
  const teamClub = await teamClubLookup(db, before.filter((a) => a.scopeType === "team").map((a) => a.scopeId ?? ""), session);
  const { indexes } = planHoldingEnds(before, after, holdings, contextFromTeams(teamClub));
  if (!indexes.length) return 0;
  const now = new Date().toISOString();
  const set: Record<string, unknown> = { updatedAt: now };
  for (const i of indexes) {
    set[`roleHoldings.${i}.status`] = "ended";
    set[`roleHoldings.${i}.endedAt`] = now;
    set[`roleHoldings.${i}.endedBy`] = endedBy;
  }
  await db.collection("members").updateOne({ memberId }, { $set: set, $inc: { roleVersion: 1 } }, session ? { session } : undefined);
  return indexes.length;
}
