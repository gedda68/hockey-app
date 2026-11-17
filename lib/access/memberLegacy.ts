// lib/access/memberLegacy.ts
// Everything a member document says about the older roles: members.roles plus the role on their login.

import { normalizeMemberRoles } from "@/lib/auth/memberRoles";
import { authRoleAssignment, type LegacyAssignment } from "@/lib/access/legacyMapping";

export function legacyAssignmentsOf(member: any): LegacyAssignment[] {
  const clubId = member?.clubId || member?.membership?.clubId || null;
  const list = normalizeMemberRoles(member?.roles, clubId) as unknown as LegacyAssignment[];
  const auth = authRoleAssignment(member ?? {});
  return auth ? [...list, auth] : list;
}
