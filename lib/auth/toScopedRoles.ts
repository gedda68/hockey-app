import type { ScopedRole } from "@/lib/auth/session";
import type { RoleAssignment } from "@/lib/types/roles";

/** DB roles[] → minimal ScopedRole[] for JWT (same rules as login route). */
export function toScopedRoles(roles: RoleAssignment[]): ScopedRole[] {
  const now = new Date();
  return roles
    .filter((r) => r.active !== false)
    .filter((r) => !r.expiresAt || new Date(r.expiresAt) > now)
    .map((r) => ({
      role: r.role,
      scopeType: r.scopeType,
      ...(r.scopeId ? { scopeId: r.scopeId } : {}),
    }));
}
