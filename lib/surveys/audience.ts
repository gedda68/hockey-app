// lib/surveys/audience.ts
// Who a survey goes to: everyone in its scope (everyone / an association and optionally the ones below it / a club /
// a team), narrowed by team, age, role and competition or tournament participation. Juniors are asked through their
// parents or guardians. Loads from the database; the narrowing rules are pure and tested.

import type { Db } from "mongodb";
import { guardianIdsFor, isMinor } from "@/lib/access/guardians";
import { legacyAssignmentsFor } from "@/lib/access/matrix";
import { normalizeMemberRoles } from "@/lib/auth/memberRoles";
import { ageOn } from "@/lib/members/blueCard";
import { memberBelongsToClubFilter } from "@/lib/rosters/memberClubQuery";
import type { AudienceGroup, SurveyInput } from "@/lib/surveys/types";

export const AUDIENCE_LIMIT = 20000;

export interface Respondent {
  /** The person who answers (a parent for a junior). */
  memberId: string;
  /** The junior they answer for, when it is a parent. */
  onBehalfOf?: { memberId: string; name: string };
  email: string | null;
  mobile: string | null;
  emailOk: boolean;
}

/** Role names that count as each group. */
const GROUP_ROLES: Record<AudienceGroup, string[]> = {
  player: ["player"],
  coach: ["coach", "assoc-coach", "head-coach", "assistant-coach"],
  manager: ["manager", "team-manager"],
  umpire: ["umpire", "technical-official"],
  volunteer: ["volunteer"],
};

/** Does someone holding these roles (and rostered or not) belong to one of the chosen groups? Empty = everyone. */
export function inGroups(groups: AudienceGroup[], roles: string[], rostered: boolean): boolean {
  if (groups.length === 0) return true;
  const have = new Set(roles.map((r) => r.toLowerCase()));
  return groups.some((g) => (g === "player" && rostered) || GROUP_ROLES[g].some((r) => have.has(r)));
}

/** The association and every association below it. */
export function descendantAssociationIds(rows: { associationId: string; parentAssociationId?: string | null }[], rootId: string): string[] {
  const out = new Set<string>([rootId]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const a of rows) {
      if (a.parentAssociationId && out.has(String(a.parentAssociationId)) && !out.has(String(a.associationId))) {
        out.add(String(a.associationId));
        grew = true;
      }
    }
  }
  return [...out];
}

const PROJ = { memberId: 1, personalInfo: 1, firstName: 1, lastName: 1, contact: 1, roles: 1, roleHoldings: 1, clubId: 1, associationId: 1, membership: 1, notificationPrefs: 1, family: 1, relatedPersons: 1, guardians: 1 };

const nameOf = (m: any) => `${m.personalInfo?.firstName ?? m.firstName ?? ""} ${m.personalInfo?.lastName ?? m.lastName ?? ""}`.trim() || "your child";
const emailOf = (m: any) => String(m.contact?.primaryEmail ?? m.contact?.email ?? "").trim() || null;
const mobileOf = (m: any) => String(m.contact?.mobile ?? m.contact?.phone ?? "").trim() || null;
const emailAllowed = (m: any) => m.notificationPrefs?.enabled !== false;

async function rosterMemberIds(db: Db, filter: Record<string, unknown>): Promise<Set<string>> {
  const teams = await db.collection("teams").find(filter, { projection: { roster: 1 } }).toArray();
  return new Set(teams.flatMap((t) => ((t.roster ?? []) as { memberId?: string }[]).map((r) => String(r.memberId ?? "")).filter(Boolean)));
}

export async function clubRefsUnder(db: Db, associationIds: string[]): Promise<string[]> {
  const clubs = await db.collection("clubs").find({ parentAssociationId: { $in: associationIds } }, { projection: { id: 1, clubId: 1, slug: 1 } }).toArray();
  return [...new Set(clubs.flatMap((c) => [c.id, c.clubId, c.slug]).filter(Boolean).map(String))];
}

/** Everyone the survey reaches, as the people who will answer it. Capped at AUDIENCE_LIMIT. */
export async function resolveRespondents(db: Db, s: Pick<SurveyInput, "level" | "scopeId" | "includeBelow" | "audience">, now: Date = new Date()): Promise<{ respondents: Respondent[]; capped: boolean }> {
  const { audience } = s;
  const and: Record<string, unknown>[] = [{ "membership.status": { $nin: ["Inactive", "inactive"] } }];
  let teamRosterIds: Set<string> | null = null;
  let clubIdsForPlayers: string[] = [];

  if (s.level === "team") {
    teamRosterIds = await rosterMemberIds(db, { teamId: s.scopeId });
    and.push({ memberId: { $in: [...teamRosterIds] } });
  } else if (s.level === "club") {
    and.push(memberBelongsToClubFilter(s.scopeId));
    clubIdsForPlayers = [s.scopeId];
  } else if (s.level === "association") {
    let ids = [s.scopeId];
    if (s.includeBelow) {
      const all = await db.collection("associations").find({}, { projection: { associationId: 1, parentAssociationId: 1 } }).toArray();
      ids = descendantAssociationIds(all as any, s.scopeId);
    }
    const refs = await clubRefsUnder(db, ids);
    clubIdsForPlayers = refs;
    and.push({ $or: [{ "membership.associationId": { $in: ids } }, { associationId: { $in: ids } }, { "membership.clubId": { $in: refs } }, { clubId: { $in: refs } }] });
  }

  // Only people on the chosen teams.
  let teamLimit: Set<string> | null = null;
  if (audience.teamIds.length && s.level !== "team") teamLimit = await rosterMemberIds(db, { teamId: { $in: audience.teamIds } });
  // Only people who took part in a competition or tournament.
  let participants: Set<string> | null = null;
  if (audience.participantsOf) {
    const { type, id } = audience.participantsOf;
    if (type === "competition") participants = await rosterMemberIds(db, { seasonCompetitionId: id });
    else {
      const entries = await db.collection("team_tournament_entries").find({ tournamentId: id, status: { $ne: "withdrawn" } }, { projection: { attendingMemberIds: 1, teamId: 1 } }).toArray();
      participants = new Set(entries.flatMap((e) => ((e.attendingMemberIds ?? []) as string[]).map(String)));
      if (participants.size === 0) {
        const teamIds = entries.map((e) => String(e.teamId)).filter(Boolean);
        if (teamIds.length) participants = await rosterMemberIds(db, { teamId: { $in: teamIds } });
      }
    }
  }
  const narrow = [teamLimit, participants].filter((x): x is Set<string> => !!x);
  if (narrow.length) and.push({ memberId: { $in: [...narrow.reduce((a, b) => new Set([...a].filter((x) => b.has(x))))] } });

  let playerIds: Set<string> | null = null;
  if (audience.groups.includes("player")) {
    playerIds = s.level === "team" ? teamRosterIds : s.level === "global"
      ? await rosterMemberIds(db, {})
      : await rosterMemberIds(db, { clubId: { $in: clubIdsForPlayers } });
  }

  const members = await db.collection("members").find({ $and: and }, { projection: PROJ }).limit(AUDIENCE_LIMIT + 1).toArray();
  const capped = members.length > AUDIENCE_LIMIT;

  const chosen = members.slice(0, AUDIENCE_LIMIT).filter((m: any) => {
    if (audience.maxAge != null) {
      const age = ageOn(m.personalInfo?.dateOfBirth, now);
      if (age === null || age > audience.maxAge) return false;
    }
    if (audience.groups.length) {
      const roles = [
        ...normalizeMemberRoles(m.roles, m.membership?.clubId || m.clubId).map((r: any) => String(r.role ?? "")),
        ...(legacyAssignmentsFor(Array.isArray(m.roleHoldings) ? m.roleHoldings : [], { blueCardValid: true }) as any[]).map((r) => String(r.role ?? "")),
      ];
      if (!inGroups(audience.groups, roles, !!playerIds?.has(String(m.memberId)))) return false;
    }
    return true;
  });

  // Juniors are asked through their parents or guardians.
  const respondents = new Map<string, Respondent>();
  const needGuardians: { child: any; guardianIds: string[] }[] = [];
  for (const m of chosen) {
    const id = String(m.memberId);
    if (audience.includeGuardians && isMinor(m.personalInfo?.dateOfBirth, now)) {
      const gids = await guardianIdsFor(db, m).catch(() => [] as string[]);
      if (gids.length) { needGuardians.push({ child: m, guardianIds: gids }); continue; }
    }
    respondents.set(id, { memberId: id, email: emailOf(m), mobile: mobileOf(m), emailOk: emailAllowed(m) });
  }
  if (needGuardians.length) {
    const ids = [...new Set(needGuardians.flatMap((g) => g.guardianIds))];
    const guardians = await db.collection("members").find({ memberId: { $in: ids } }, { projection: PROJ }).toArray();
    const byId = new Map(guardians.map((g: any) => [String(g.memberId), g]));
    // A parent is asked once per survey, however many of their children are in the audience.
    const kidsOf = new Map<string, any[]>();
    for (const { child, guardianIds } of needGuardians) for (const gid of guardianIds) kidsOf.set(gid, [...(kidsOf.get(gid) ?? []), child]);
    for (const [gid, kids] of kidsOf) {
      const g = byId.get(gid);
      if (!g) continue;
      respondents.set(gid, {
        memberId: gid,
        ...(kids.length === 1 ? { onBehalfOf: { memberId: String(kids[0].memberId), name: nameOf(kids[0]).split(" ")[0] || "your child" } } : {}),
        email: emailOf(g), mobile: mobileOf(g), emailOk: emailAllowed(g),
      });
    }
  }
  return { respondents: [...respondents.values()], capped };
}
