import {
  associationPortalSubdomain,
  clubPortalSubdomain,
} from "@/lib/tenant/portalLabels";

const ASSOCIATION_ROLES = new Set([
  "association-admin",
  "assoc-committee",
  "assoc-coach",
  "assoc-selector",
  "assoc-registrar",
  "assoc-competition",
  "media-marketing",
]);

const CLUB_ROLES = new Set([
  "club-admin",
  "club-committee",
  "registrar",
  "coach",
  "manager",
  "team-selector",
  "volunteer",
  "umpire",
  "technical-official",
]);

const PORTAL_CLUB_ROLES = new Set(["player", "member", "parent"]);

export { ASSOCIATION_ROLES, CLUB_ROLES, PORTAL_CLUB_ROLES };

type AssocPortalFields = { code?: string | null; portalSlug?: string | null };
type ClubPortalFields = {
  shortName?: string | null;
  abbreviation?: string | null;
  portalSlug?: string | null;
  slug?: string | null;
};

/**
 * Host label for {slug}.{PORTAL_ROOT_DOMAIN} — stored in the session JWT so
 * middleware can redirect /admin and /portal to the correct tenant without a DB hit.
 */
export function resolvePortalSubdomainLabel(opts: {
  role: string;
  clubId: string | null;
  club?: ClubPortalFields | null;
  associationId: string | null;
  association?: AssocPortalFields | null;
}): string | null {
  if (opts.role === "super-admin") return null;
  if (ASSOCIATION_ROLES.has(opts.role) && opts.association) {
    const s = associationPortalSubdomain(opts.association);
    return s || null;
  }
  if (
    (CLUB_ROLES.has(opts.role) || PORTAL_CLUB_ROLES.has(opts.role)) &&
    opts.clubId &&
    opts.club
  ) {
    const s = clubPortalSubdomain(opts.club);
    return s || null;
  }
  if (opts.associationId && opts.association) {
    const s = associationPortalSubdomain(opts.association);
    return s || null;
  }
  return null;
}

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
