/**
 * Role grant workflow (domain rules)
 *
 * 1) **Automatic grants** — When someone is approved for a position they applied for
 *    (e.g. club registration with selected member_roles, or committee appointment),
 *    the system should add the matching `RoleAssignment` once prerequisites are met
 *    (e.g. registration approved; fees satisfied where required).
 *
 * 2) **Voluntary / extra roles** — When someone requests an additional role via
 *    `role_requests`, only an approver who is strictly more privileged than the
 *    requested role (within the same org scope), or an org/club administrator,
 *    may approve it. See `canApproveRoleRequestPrivilege`.
 *
 * Team roster “accept + pay → role” hooks can call the same assignment helpers when
 * those flows persist acceptance and payment in the database.
 */

import type { ClientSession, Db } from "mongodb";
import {
  ROLE_DEFINITIONS,
  rolePrivilegeRank,
  type RoleAssignment,
  type UserRole,
} from "@/lib/types/roles";
import type { SessionData } from "@/lib/auth/session";
import type { RoleRequest } from "@/types/roleRequests";

/** Map `member_roles.category` (registration picker) → platform `UserRole`. */
const MEMBER_ROLE_CATEGORY_TO_USER_ROLE: Record<string, UserRole> = {
  player: "player",
  coach: "coach",
  manager: "manager",
  "team-manager": "manager",
  parent: "parent",
  member: "member",
  volunteer: "volunteer",
  umpire: "umpire",
  "technical-official": "technical-official",
};

function assignmentKey(a: Pick<RoleAssignment, "role" | "scopeType" | "scopeId">): string {
  return `${a.role}::${a.scopeType}::${a.scopeId ?? ""}`;
}

/**
 * Whether the approver’s role set may approve assigning `requestedRole`.
 * Org/club admins bypass rank (still subject to scope checks elsewhere).
 */
export function canApproveRoleRequestPrivilege(
  grantorRoles: string[],
  requestedRole: UserRole,
): boolean {
  if (!(requestedRole in ROLE_DEFINITIONS)) return false;
  if (requestedRole === "super-admin" || requestedRole === "public") return false;

  const uniq = [...new Set(grantorRoles.filter(Boolean))];
  if (uniq.includes("super-admin")) return true;
  if (uniq.includes("association-admin")) return true;
  if (uniq.includes("club-admin")) return true;

  const reqRank = rolePrivilegeRank(requestedRole);
  const best = Math.min(...uniq.map((r) => rolePrivilegeRank(r)));
  return best < reqRank;
}

/**
 * Roles from the current session that apply to the role_request’s scope
 * (including association roles that govern a club/team in the request).
 */
export async function collectGrantorRolesForRoleRequest(
  session: SessionData,
  db: Db,
  req: RoleRequest,
): Promise<string[]> {
  const out = new Set<string>();
  if (session.role) out.add(session.role);
  const scoped = session.scopedRoles ?? [];

  const clubDoc =
    req.scopeType === "club" && req.scopeId
      ? await db.collection("clubs").findOne({
          $or: [{ id: req.scopeId }, { clubId: req.scopeId }, { slug: req.scopeId }],
        })
      : null;
  const clubIdForTeam =
    req.scopeType === "team" && req.scopeId
      ? (
          await db
            .collection("teams")
            .findOne({ teamId: req.scopeId }, { projection: { clubId: 1 } })
        )?.clubId
      : null;
  const clubForTeam = clubIdForTeam
    ? await db.collection("clubs").findOne({
        $or: [{ id: clubIdForTeam }, { clubId: clubIdForTeam }],
      })
    : null;

  for (const sr of scoped) {
    if (!sr.role) continue;
    if (sr.scopeType === "global") {
      out.add(sr.role);
      continue;
    }
    if (req.scopeType === "association" && sr.scopeType === "association" && sr.scopeId === req.scopeId) {
      out.add(sr.role);
      continue;
    }
    if (req.scopeType === "club" && sr.scopeType === "club" && sr.scopeId && req.scopeId) {
      const id = clubDoc?.id ?? clubDoc?.clubId ?? req.scopeId;
      if (sr.scopeId === id || sr.scopeId === req.scopeId) out.add(sr.role);
      continue;
    }
    if (req.scopeType === "club" && sr.scopeType === "association" && sr.scopeId && clubDoc) {
      const parent = clubDoc.parentAssociationId ?? clubDoc.associationId;
      if (parent && String(parent) === sr.scopeId) out.add(sr.role);
      continue;
    }
    if (req.scopeType === "team" && sr.scopeType === "team" && sr.scopeId === req.scopeId) {
      out.add(sr.role);
      continue;
    }
    if (req.scopeType === "team" && sr.scopeType === "club" && sr.scopeId && clubForTeam) {
      const cid = clubForTeam.id ?? clubForTeam.clubId;
      if (cid && String(cid) === sr.scopeId) out.add(sr.role);
      continue;
    }
    if (req.scopeType === "team" && sr.scopeType === "association" && sr.scopeId && clubForTeam) {
      const parent = clubForTeam.parentAssociationId ?? clubForTeam.associationId;
      if (parent && String(parent) === sr.scopeId) out.add(sr.role);
    }
  }

  return [...out];
}

export function buildAssignmentsFromMemberRoleCategories(
  clubId: string,
  roleIds: string[],
  memberRoleDocs: Array<{ roleId?: string; category?: string }>,
  grantedBy: string,
  grantedAt: string,
  seasonYear?: string,
): RoleAssignment[] {
  const idSet = new Set(roleIds);
  const list: RoleAssignment[] = [];

  for (const doc of memberRoleDocs) {
    const rid = doc.roleId;
    if (!rid || !idSet.has(rid)) continue;
    const cat = typeof doc.category === "string" ? doc.category.toLowerCase().trim() : "";
    const userRole = MEMBER_ROLE_CATEGORY_TO_USER_ROLE[cat];
    if (!userRole || !(userRole in ROLE_DEFINITIONS)) continue;

    const def = ROLE_DEFINITIONS[userRole];
    if (!def.scopeTypes.includes("club")) continue;

    const row: RoleAssignment = {
      role: userRole,
      scopeType: "club",
      scopeId: clubId,
      grantedAt,
      grantedBy,
      active: true,
      notes: `Granted from approved club registration (${rid})`,
    };
    if (seasonYear) row.seasonYear = seasonYear;
    if (seasonYear && def.seasonalRegistration) {
      row.expiresAt = `${seasonYear}-12-31T23:59:59.000Z`;
    }
    list.push(row);
  }

  return list;
}

/**
 * After a club registration is approved, push matching `members.roles[]` assignments
 * derived from `registration.roleIds` × `member_roles.category`.
 */
export async function applyApprovedClubRegistrationRoles(
  db: Db,
  mongoSession: ClientSession,
  registration: {
    memberId: string;
    roleIds?: string[];
    seasonYear?: string;
  },
  clubId: string,
  grantedBy: string,
): Promise<void> {
  const roleIds = registration.roleIds;
  if (!roleIds?.length) return;

  const docs = await db
    .collection("member_roles")
    .find(
      { roleId: { $in: roleIds } },
      { projection: { roleId: 1, category: 1 }, session: mongoSession },
    )
    .toArray();

  const now = new Date().toISOString();
  const newAssignments = buildAssignmentsFromMemberRoleCategories(
    clubId,
    roleIds,
    docs as { roleId?: string; category?: string }[],
    grantedBy,
    now,
    registration.seasonYear,
  );
  if (newAssignments.length === 0) return;

  const member = await db.collection("members").findOne(
    { memberId: registration.memberId },
    { session: mongoSession, projection: { roles: 1 } },
  );
  const existing = (member?.roles as RoleAssignment[] | undefined) ?? [];
  const keys = new Set(existing.map(assignmentKey));
  const toAdd = newAssignments.filter((a) => !keys.has(assignmentKey(a)));
  if (toAdd.length === 0) return;

  await db.collection("members").updateOne(
    { memberId: registration.memberId },
    { $push: { roles: { $each: toAdd } } as never },
    { session: mongoSession },
  );
}
