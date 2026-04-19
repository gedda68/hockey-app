// lib/auth/clubListScope.ts
// Derives which clubs a session may list on GET /api/admin/clubs (no global leak).

import type { SessionData } from "@/lib/auth/session";
import { sessionDataToAssignments } from "@/lib/auth/sessionAssignments";
import type { UserRole } from "@/lib/types/roles";

/** Primary roles that manage an association and expect the club directory scoped to it. */
const ASSOCIATION_PRIMARY_ROLES_FOR_CLUB_DIRECTORY = new Set<UserRole>([
  "association-admin",
  "assoc-committee",
  "assoc-coach",
  "assoc-selector",
  "assoc-registrar",
  "assoc-competition",
  "media-marketing",
]);

export type ClubListScope =
  | { kind: "all" }
  | { kind: "associations"; associationIds: string[] }
  | { kind: "clubs"; clubRefs: string[] }
  | { kind: "none" };

/**
 * Who should default the admin Clubs page filter to their association (client hint).
 */
export function shouldDefaultClubListToAssociation(user: {
  role: string;
  associationId?: string | null;
} | null): boolean {
  if (!user || user.role === "super-admin") return false;
  if (!user.associationId) return false;
  return ASSOCIATION_PRIMARY_ROLES_FOR_CLUB_DIRECTORY.has(user.role as UserRole);
}

export function getClubListScope(session: SessionData | null): ClubListScope {
  if (!session) return { kind: "none" };
  if (session.role === "super-admin") return { kind: "all" };
  if (session.scopedRoles?.some((r) => r.role === "super-admin")) {
    return { kind: "all" };
  }

  const assignments = sessionDataToAssignments(session);
  const associationIds = new Set<string>();
  const clubRefs = new Set<string>();

  for (const a of assignments) {
    if (a.active === false) continue;
    if (a.scopeType === "association" && a.scopeId) associationIds.add(a.scopeId);
    if (a.scopeType === "club" && a.scopeId) clubRefs.add(a.scopeId);
  }

  if (
    session.associationId &&
    ASSOCIATION_PRIMARY_ROLES_FOR_CLUB_DIRECTORY.has(session.role as UserRole)
  ) {
    associationIds.add(session.associationId);
  }

  if (associationIds.size > 0) {
    return { kind: "associations", associationIds: [...associationIds] };
  }

  if (session.clubId) clubRefs.add(session.clubId);
  if (session.clubSlug) clubRefs.add(session.clubSlug);

  if (clubRefs.size > 0) {
    return { kind: "clubs", clubRefs: [...clubRefs] };
  }

  return { kind: "none" };
}
