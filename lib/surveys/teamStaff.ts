// lib/surveys/teamStaff.ts
// Coaches and team managers may run surveys for the teams they are on the staff of (a roster entry that is a coach or
// manager role). Nothing wider: not their club, not other teams.

import type { Db } from "mongodb";
import { getDatabase } from "@/lib/mongodb";
import type { SessionData } from "@/lib/auth/session";
import { resolveSessionMemberId } from "@/lib/auth/sessionMember";

/** A roster role that counts as running the team (coach, assistant coach, team manager, manager). */
export const isTeamStaffRole = (roleId: unknown): boolean => /(^|-)(coach|manager)(-|$)/i.test(String(roleId ?? ""));

export async function teamsStaffedBy(session: SessionData, db?: Db): Promise<string[]> {
  if (!session.memberId) return [];
  const d = db ?? (await getDatabase());
  const me = await resolveSessionMemberId(d, session);
  if (!me) return [];
  const rows = await d
    .collection("teams")
    .find({ roster: { $elemMatch: { memberId: me, roleId: { $regex: "coach|manager", $options: "i" } } }, status: { $ne: "archived" } }, { projection: { teamId: 1, roster: 1 } })
    .limit(200)
    .toArray();
  return rows
    .filter((t) => ((t.roster as { memberId?: string; roleId?: string }[]) ?? []).some((r) => String(r.memberId) === me && isTeamStaffRole(r.roleId)))
    .map((t) => String(t.teamId));
}
