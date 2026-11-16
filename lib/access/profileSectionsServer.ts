// lib/access/profileSectionsServer.ts — work out the section access for one member record.

import type { Db } from "mongodb";
import type { SessionData } from "@/lib/auth/session";
import { resolveSessionMemberId } from "@/lib/auth/sessionMember";
import { accessForSession, loadMemberHoldings } from "@/lib/access/memberAccess";
import { decideArea } from "@/lib/access/areaAccess";
import { resolveAccess, codeForTarget, type OrgType, type ScopeTarget } from "@/lib/access/matrix";
import { rosterAgeGroups, teamScopeValue } from "@/lib/access/scopeTargets";
import { sectionsFromCodes, fullSections, type SectionMap } from "@/lib/access/profileSections";

const KEYS: Record<OrgType, { members: string; medical: string; childSafety: string; usersRoles: string }> = {
  club: { members: "membersRegistrations", medical: "medicalInjury", childSafety: "childSafetyIncidents", usersRoles: "usersRoles" },
  association: { members: "memberRegistry", medical: "medicalInjury", childSafety: "integrityChildSafety", usersRoles: "usersRoles" },
};

/** The teams / age groups a member is on in this club (the scope tokens a coach's role may name). */
export async function targetForMember(db: Db, clubId: string, memberId: string): Promise<ScopeTarget> {
  const rosters = await db.collection("teamRosters")
    .find({ clubId, $or: [
      { "teams.players.id": memberId }, { "teams.players.playerId": memberId }, { "teams.players.memberId": memberId },
      { "teams.coach.memberId": memberId }, { "teams.assistantCoach.memberId": memberId }, { "teams.manager.memberId": memberId },
    ] }, { projection: { id: 1, grade: 1, division: 1, teams: 1 } })
    .limit(50).toArray();
  const teamIds: string[] = [], ageGroups: string[] = [];
  for (const r of rosters as any[]) {
    for (const t of r.teams ?? []) {
      const on = (t.players ?? []).some((p: any) => [p.id, p.playerId, p.memberId].includes(memberId))
        || [t.coach, t.assistantCoach, t.manager].some((s: any) => s && (s.memberId === memberId || s.id === memberId));
      if (on) { teamIds.push(teamScopeValue(String(r.id), String(t.name ?? ""))); ageGroups.push(...rosterAgeGroups(r)); }
    }
  }
  return { memberId, teamIds, ageGroups };
}

/** Full access unless the matrix applies to this person (see decideArea). */
export async function sectionsForViewer(db: Db, session: SessionData | null, memberId: string): Promise<SectionMap> {
  if (!session?.memberId) return fullSections();
  const access = await accessForSession(db, session);
  if (!decideArea(access, session.role, "members", "V").enforced || access.context.kind !== "org") return fullSections();

  const me = await resolveSessionMemberId(db, session);
  if (me && me === memberId) return fullSections(); // their own record: the owner rules apply elsewhere

  const { holdings, blueCardValid } = await loadMemberHoldings(db, session);
  const res = resolveAccess(holdings, access.context, { blueCardValid });
  const target = { ...(await targetForMember(db, access.context.orgId, memberId)), clubId: access.context.orgId };
  const k = KEYS[access.context.orgType];
  return sectionsFromCodes({
    members: codeForTarget(res, k.members, target),
    medical: codeForTarget(res, k.medical, target),
    childSafety: codeForTarget(res, k.childSafety, target),
    usersRoles: codeForTarget(res, k.usersRoles, target),
  });
}
