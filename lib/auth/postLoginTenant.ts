const ASSOCIATION_ROLES = new Set([
  "association-admin",
  "assoc-committee",
  "assoc-coach",
  "assoc-selector",
  "assoc-registrar",
  "assoc-competition",
]);

const CLUB_ROLES = new Set([
  "club-admin",
  "club-committee",
  "registrar",
  "coach",
  "manager",
  "team-selector",
  "volunteer",
]);

const PORTAL_CLUB_ROLES = new Set(["player", "member", "parent"]);

/**
 * When logging in from the apex site, navigate to this origin so admin and
 * club portal URLs stay on the club/association subdomain.
 */
export function pickTenantOriginForLogin(
  role: string,
  clubPortalOrigin?: string | null,
  associationPortalOrigin?: string | null,
): string | null {
  if (role === "super-admin") return null;
  if (ASSOCIATION_ROLES.has(role) && associationPortalOrigin) {
    return associationPortalOrigin;
  }
  if (CLUB_ROLES.has(role) && clubPortalOrigin) return clubPortalOrigin;
  if (PORTAL_CLUB_ROLES.has(role) && clubPortalOrigin) {
    return clubPortalOrigin;
  }
  return null;
}
