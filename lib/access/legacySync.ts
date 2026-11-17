// lib/access/legacySync.ts
// Database helpers that keep members.roleHoldings in step with legacy role grants.

import type { ClientSession, Db } from "mongodb";
import type { RoleHolding } from "@/lib/access/matrix";
import { planMemberHoldings, type LegacyAssignment, type LegacyContext } from "@/lib/access/legacyMapping";

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
