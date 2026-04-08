// lib/auth/sessionAssignments.ts
// JWT session → RoleAssignment[] for canAccessResource / getEffectivePermissions.

import type { SessionData } from "@/lib/auth/session";
import type { RoleAssignment, UserRole } from "@/lib/types/roles";

export function sessionDataToAssignments(s: SessionData): RoleAssignment[] {
  const grantedAt = new Date().toISOString();
  if (s.scopedRoles && s.scopedRoles.length > 0) {
    return s.scopedRoles.map((sr) => ({
      role: sr.role as UserRole,
      scopeType: sr.scopeType,
      scopeId: sr.scopeId,
      grantedAt,
      active: true,
    }));
  }
  return [
    {
      role: s.role as UserRole,
      scopeType: s.clubId
        ? "club"
        : s.associationId
          ? "association"
          : "global",
      scopeId: s.clubId ?? s.associationId ?? undefined,
      grantedAt,
      active: true,
    },
  ];
}
