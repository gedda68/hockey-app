import {
  ROLE_DEFINITIONS,
  type RoleAssignment,
  type ScopeType,
  type UserRole,
} from "@/lib/types/roles";

/**
 * Builds every role assignment that is valid for the given scopes, from
 * `ROLE_DEFINITIONS` (skips super-admin / public / global-only).
 * Used by tiered demo seed so one account can exercise the persona switcher.
 */
export function buildFullTestRoleGrants(params: {
  grantedAt: string;
  associationIds: string[];
  clubId: string | null;
  teamId: string | null;
}): RoleAssignment[] {
  const { grantedAt, associationIds, clubId, teamId } = params;
  const seen = new Set<string>();
  const out: RoleAssignment[] = [];

  const push = (role: UserRole, scopeType: ScopeType, scopeId: string) => {
    const k = `${role}::${scopeType}::${scopeId}`;
    if (seen.has(k)) return;
    seen.add(k);
    out.push({ role, scopeType, scopeId, grantedAt, active: true });
  };

  for (const role of Object.keys(ROLE_DEFINITIONS) as UserRole[]) {
    if (role === "super-admin" || role === "public") continue;
    const def = ROLE_DEFINITIONS[role];
    for (const st of def.scopeTypes) {
      if (st === "global") continue;
      if (st === "association") {
        for (const aid of associationIds) push(role, "association", aid);
      }
      if (st === "club" && clubId) {
        push(role, "club", clubId);
      }
      if (st === "team" && teamId) {
        push(role, "team", teamId);
      }
    }
  }

  return out;
}
