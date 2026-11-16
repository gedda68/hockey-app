// lib/access/memberScope.ts — which members a Team / Age-group scoped person may see.
// People whose Members access comes only from narrowly scoped roles (e.g. a Head Coach) see the players and
// staff on their own teams / age groups, plus themselves. Everyone else is unrestricted (null).

import type { Db } from "mongodb";
import type { SessionData } from "@/lib/auth/session";
import { resolveSessionMemberId } from "@/lib/auth/sessionMember";
import { accessForSession, loadMemberHoldings } from "@/lib/access/memberAccess";
import { decideArea, areaKey } from "@/lib/access/areaAccess";
import { resolveAccess, narrowHoldings, type AccessCode } from "@/lib/access/matrix";
import { holdingCoversTeam } from "@/lib/access/scopeTargets";

type StaffLike = { id?: string; memberId?: string } | undefined | null;
type PlayerLike = { id?: string; playerId?: string; memberId?: string };

/** Member ids on the covered teams of the club's rosters. */
export function memberIdsOnCoveredTeams(
  rosters: { id?: string; grade?: string; division?: string; teams?: { name?: string; players?: PlayerLike[]; coach?: StaffLike; assistantCoach?: StaffLike; manager?: StaffLike }[] }[],
  holdings: { teamIds?: string[]; ageGroups?: string[] }[],
): string[] {
  const ids = new Set<string>();
  for (const r of rosters) {
    for (const t of r.teams ?? []) {
      if (!holdings.some((h) => holdingCoversTeam(h, r, t))) continue;
      for (const p of t.players ?? []) { const id = p.memberId ?? p.playerId ?? p.id; if (id) ids.add(String(id)); }
      for (const s of [t.coach, t.assistantCoach, t.manager]) { const id = s?.memberId ?? s?.id; if (id) ids.add(String(id)); }
    }
  }
  return [...ids];
}

/** null = no narrowing. Otherwise the member ids the person may see. */
export async function allowedMemberIds(db: Db, session: SessionData, min: AccessCode = "R"): Promise<string[] | null> {
  if (!session.memberId) return null;
  const access = await accessForSession(db, session);
  if (!decideArea(access, session.role, "members", min).enforced || access.context.kind !== "org") return null;
  const { holdings, blueCardValid } = await loadMemberHoldings(db, session);
  const res = resolveAccess(holdings, access.context, { blueCardValid });
  const narrow = narrowHoldings(res, areaKey("members", access.context.orgType), min);
  if (!narrow) return null;

  const teamLike = narrow.filter((n) => n.role.scope === "team" || n.role.scope === "ageGroup").map((n) => n.holding);
  const rosters = teamLike.length
    ? ((await db.collection("teamRosters").find({ clubId: access.context.orgId }, { projection: { id: 1, grade: 1, division: 1, teams: 1 } }).toArray()) as never[])
    : [];
  const ids = new Set(memberIdsOnCoveredTeams(rosters, teamLike));
  const me = await resolveSessionMemberId(db, session);
  if (me) ids.add(me);
  return [...ids];
}
