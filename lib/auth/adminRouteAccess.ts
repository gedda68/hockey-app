// lib/auth/adminRouteAccess.ts
// Pure admin UI route access rules — shared by middleware.ts and Vitest (K3).
// Edge-safe: no Node-only imports.

export interface AdminRouteScopedRole {
  role: string;
  scopeType: "global" | "association" | "club" | "team";
  scopeId?: string;
}

/** Subset of session fields needed for /admin and /portal path checks */
export interface AdminRouteSession {
  role: string;
  scopedRoles?: AdminRouteScopedRole[];
  associationId?: string | null;
  clubId?: string | null;
  clubSlug?: string | null;
}

// ── Role sets (keep in sync with middleware.ts + docs/domain/ROLE_MATRIX.md) ──

const SUPER_ADMIN = ["super-admin"];

const ASSOCIATION_ROLES = ["super-admin", "association-admin"];

/** Association subtree in admin UI — competition coordinators without finance (B5). */
const ASSOCIATION_TREE_ROLES = [
  "super-admin",
  "association-admin",
  "assoc-competition",
];

const ASSOC_STAFF_ROLES = [
  "super-admin",
  "association-admin",
  "assoc-committee",
  "assoc-coach",
  "assoc-selector",
  "assoc-registrar",
  "assoc-competition",
  "media-marketing",
];

const CLUB_AND_ABOVE = ["super-admin", "association-admin", "club-admin"];

/** Roles that may use /admin/bulk-import (API still enforces per-entity permissions). */
const BULK_IMPORT_PAGE_ROLES = [
  ...CLUB_AND_ABOVE,
  "assoc-committee",
  "assoc-coach",
  "assoc-selector",
  "assoc-registrar",
  "assoc-competition",
  "media-marketing",
  "club-committee",
  "registrar",
  "team-selector",
];

/**
 * Association staff who can look (not change) at clubs, members and players for oversight. The APIs scope them
 * to their own association and give them view-only permissions; media/marketing is left out.
 */
const ASSOC_OVERSIGHT = [
  "assoc-committee",
  "assoc-coach",
  "assoc-selector",
  "assoc-registrar",
  "assoc-competition",
];

const CLUB_MANAGEMENT = [
  "super-admin",
  "association-admin",
  "club-admin",
  "club-committee",
  "registrar",
];

const TEAM_STAFF = [
  "super-admin",
  "association-admin",
  "club-admin",
  "coach",
  "manager",
];

const PLAYER_MANAGEMENT = [
  "super-admin",
  "association-admin",
  "club-admin",
  "club-committee",
  "registrar",
  "coach",
  "manager",
];

const NOMINATION_ACCESS = [
  "super-admin",
  "association-admin",
  "assoc-selector",
  "assoc-coach",
  "club-admin",
  "team-selector",
  "coach",
];

const FINANCE_ROLES = [
  "super-admin",
  "association-admin",
  "assoc-committee",
  "assoc-registrar",
  "club-admin",
  "club-committee",
  "registrar",
];

const SETTINGS_ROLES = [
  "super-admin",
  "association-admin",
  "assoc-committee",
  "media-marketing",
  "club-admin",
  "club-committee",
];

/** Team selection policy UI + hubs (keep in sync with menuConfig SELECTION_POLICY_ROLES). */
const SELECTION_POLICY_ROLES = [
  "super-admin",
  "association-admin",
  "assoc-committee",
  "assoc-coach",
  "assoc-selector",
  "assoc-registrar",
  "assoc-competition",
  "media-marketing",
  "club-admin",
  "club-committee",
  "registrar",
  "coach",
  "manager",
  "team-selector",
];

const ANY_ADMIN = [
  "super-admin",
  "association-admin",
  "assoc-committee",
  "assoc-coach",
  "assoc-selector",
  "assoc-registrar",
  "assoc-competition",
  "media-marketing",
  "club-admin",
  "club-committee",
  "registrar",
  "coach",
  "manager",
  "umpire",
  "technical-official",
  "volunteer",
  "team-selector",
];

const PORTAL_ROLES = ["player", "member", "parent", ...ANY_ADMIN];

/**
 * Self-service pages: every signed-in person, whatever their role (including imported/unrecognised
 * roles), can view and edit their OWN details, registration and fees. The APIs behind them are scoped to
 * the signed-in member's own record.
 */
export const SELF_SERVICE = ["*"];
/** Where people without an admin area land: their own registration page. */
export const SELF_SERVICE_LANDING = "/admin/my-registration";
export const isAdminRole = (role: string) => ANY_ADMIN.includes(role);

interface RouteRule {
  pattern: RegExp;
  allowedRoles: string[];
  scopeCheck?: boolean;
}

const ROUTE_RULES: RouteRule[] = [
  { pattern: /^\/admin\/users(\/|$)/, allowedRoles: SUPER_ADMIN },
  { pattern: /^\/admin\/global-config(\/|$)/, allowedRoles: SUPER_ADMIN },
  { pattern: /^\/admin\/config(\/|$)/, allowedRoles: SUPER_ADMIN },

  // Members, players and parents get a personal dashboard (their own playing stats and shortcuts).
  { pattern: /^\/admin\/dashboard(\/|$)/, allowedRoles: [...ANY_ADMIN, "member", "player", "parent"] },
  { pattern: /^\/admin\/profile(\/|$)/, allowedRoles: SELF_SERVICE },
  { pattern: /^\/admin\/my-profile(\/|$)/, allowedRoles: SELF_SERVICE },
  { pattern: /^\/admin\/nominate(\/|$)/, allowedRoles: SELF_SERVICE },
  // Who may appoint which role is decided by the matrix in the API; the page just needs to open.
  { pattern: /^\/admin\/role-appointments(\/|$)/, allowedRoles: ANY_ADMIN },
  { pattern: /^\/admin\/role-holders(\/|$)/, allowedRoles: ANY_ADMIN },
  { pattern: /^\/admin\/reports(\/|$)/, allowedRoles: ANY_ADMIN },

  { pattern: /^\/admin\/settings(\/|$)/, allowedRoles: SETTINGS_ROLES, scopeCheck: true },

  {
    pattern: /^\/admin\/associations\/selection-policy(\/|$)/,
    allowedRoles: SELECTION_POLICY_ROLES,
  },
  {
    pattern: /^\/admin\/associations\/[^/]+\/selection-policy(\/|$)/,
    allowedRoles: SELECTION_POLICY_ROLES,
    scopeCheck: true,
  },
  {
    pattern: /^\/admin\/clubs\/selection-policy(\/|$)/,
    allowedRoles: SELECTION_POLICY_ROLES,
  },
  {
    pattern: /^\/admin\/clubs\/[^/]+\/selection-policy(\/|$)/,
    allowedRoles: SELECTION_POLICY_ROLES,
    scopeCheck: true,
  },

  /** Association directory + per-org pages (profile edit, venues, etc.) — all association staff. */
  { pattern: /^\/admin\/associations(\/|$)/, allowedRoles: ASSOC_STAFF_ROLES, scopeCheck: true },
  { pattern: /^\/admin\/tournaments(\/|$)/, allowedRoles: ASSOCIATION_ROLES, scopeCheck: true },

  { pattern: /^\/admin\/representative(\/|$)/, allowedRoles: ASSOC_STAFF_ROLES, scopeCheck: true },

  {
    pattern: /^\/admin\/news(\/|$)/,
    allowedRoles: [
      "super-admin",
      "association-admin",
      "assoc-committee",
      "media-marketing",
      "club-admin",
      "club-committee",
    ],
  },

  /** Match rosters: whoever picks teams for a club's matches, not only club management. */
  {
    pattern: /^\/admin\/clubs\/[^/]+\/match-rosters(\/|$)/,
    allowedRoles: [...CLUB_MANAGEMENT, "coach", "manager", "team-selector"],
    scopeCheck: true,
  },

  /** Read-only oversight: association staff may open the lists and detail pages, never create/edit pages. */
  {
    pattern: /^\/admin\/clubs\/?$|^\/admin\/clubs\/(?!new\/?$|selection-policy\/?$)[^/]+\/?$/,
    allowedRoles: [...CLUB_MANAGEMENT, ...ASSOC_OVERSIGHT],
    scopeCheck: true,
  },
  {
    pattern: /^\/admin\/members\/?$|^\/admin\/members\/(?!create\/?$)[^/]+\/?$/,
    allowedRoles: [...CLUB_MANAGEMENT, ...ASSOC_OVERSIGHT],
    scopeCheck: true,
  },
  {
    pattern: /^\/admin\/players\/?$|^\/admin\/players\/(?!new\/?$)[^/]+\/?$/,
    allowedRoles: [...PLAYER_MANAGEMENT, ...ASSOC_OVERSIGHT],
    scopeCheck: true,
  },

  /** Club directory + club profile edit — club management roles, not only club-admin. */
  { pattern: /^\/admin\/clubs(\/|$)/, allowedRoles: CLUB_MANAGEMENT, scopeCheck: true },
  { pattern: /^\/admin\/fees(\/|$)/, allowedRoles: FINANCE_ROLES, scopeCheck: true },

  { pattern: /^\/admin\/members(\/|$)/, allowedRoles: CLUB_MANAGEMENT, scopeCheck: true },
  { pattern: /^\/admin\/club-registrations(\/|$)/, allowedRoles: CLUB_MANAGEMENT, scopeCheck: true },
  { pattern: /^\/admin\/association-registrations(\/|$)/, allowedRoles: ["super-admin", "association-admin", "assoc-committee", "assoc-registrar"], scopeCheck: true },

  { pattern: /^\/admin\/players(\/|$)/, allowedRoles: PLAYER_MANAGEMENT, scopeCheck: true },
  { pattern: /^\/admin\/teams(\/|$)/, allowedRoles: TEAM_STAFF, scopeCheck: true },

  { pattern: /^\/admin\/nominations(\/|$)/, allowedRoles: NOMINATION_ACCESS, scopeCheck: true },
  { pattern: /^\/admin\/nomination-windows(\/|$)/, allowedRoles: NOMINATION_ACCESS, scopeCheck: true },
  {
    pattern: /^\/admin\/ballots(\/|$)/,
    allowedRoles: [
      "super-admin",
      "association-admin",
      "assoc-committee",
      "assoc-registrar",
      "assoc-selector",
      "club-admin",
      "club-committee",
      "registrar",
    ],
  },

  { pattern: /^\/admin\/my-registrations(\/|$)/, allowedRoles: SELF_SERVICE },
  { pattern: /^\/admin\/my-registration(\/|$)/, allowedRoles: SELF_SERVICE },
  // Limited member view for club/association admins — the API enforces scope per member.
  { pattern: /^\/admin\/registrations(\/|$)/, allowedRoles: ["super-admin", "association-admin", "assoc-committee", "assoc-registrar", "club-admin", "club-committee", "registrar"] },
  { pattern: /^\/admin\/my-fees(\/|$)/, allowedRoles: SELF_SERVICE },

  {
    pattern: /^\/admin\/role-requests(\/|$)/,
    allowedRoles: [
      "super-admin",
      "association-admin",
      "assoc-registrar",
      "club-admin",
      "registrar",
    ],
  },
  {
    pattern: /^\/admin\/role-expiry(\/|$)/,
    allowedRoles: ["super-admin", "association-admin", "club-admin", "registrar"],
  },

  {
    pattern: /^\/admin\/team-tournaments(\/|$)/,
    allowedRoles: [
      "super-admin",
      "association-admin",
      "assoc-registrar",
      "club-admin",
      "registrar",
    ],
    scopeCheck: true,
  },

  { pattern: /^\/admin\/bulk-import(\/|$)/, allowedRoles: BULK_IMPORT_PAGE_ROLES },

  { pattern: /^\/admin(\/|$)/, allowedRoles: ANY_ADMIN },

  /** Mutating/read admin JSON APIs — must be at least an admin-area role (B4). */
  { pattern: /^\/api\/admin\//, allowedRoles: ANY_ADMIN },

  { pattern: /^\/portal(\/|$)/, allowedRoles: PORTAL_ROLES },
];

/**
 * Fixed pages that live directly under /admin/clubs/ and /admin/associations/. Their first path segment is a
 * page name, not an organisation id, so the scope check must not treat it as one.
 */
const RESERVED_CLUB_SEGMENTS = ["new", "selection-policy"];
const RESERVED_ASSOC_SEGMENTS = ["new", "selection-policy", "fees", "positions", "hierarchy"];

/** Organisation id in the path, or null for fixed pages such as /admin/associations/fees. */
export function pathOrgIds(pathname: string): { clubId: string | null; assocId: string | null } {
  const club = pathname.match(/\/clubs\/([^/?\s]+)/)?.[1] ?? null;
  const assoc = pathname.match(/\/associations\/([^/?\s]+)/)?.[1] ?? null;
  return {
    clubId: club && !RESERVED_CLUB_SEGMENTS.includes(club) ? club : null,
    assocId: assoc && !RESERVED_ASSOC_SEGMENTS.includes(assoc) ? assoc : null,
  };
}

const CLUB_SCOPED_ROLES = [
  "club-admin",
  "club-committee",
  "registrar",
  "coach",
  "manager",
  "team-selector",
  "volunteer",
  "umpire",
  "technical-official",
];

const ASSOC_SCOPED_ROLES = [
  "association-admin",
  "assoc-committee",
  "assoc-coach",
  "assoc-selector",
  "assoc-registrar",
  "assoc-competition",
  "media-marketing",
];

function hasAccessViaScopedRoles(
  allowedRoles: string[],
  currentPath: string,
  scopedRoles: AdminRouteScopedRole[],
): boolean {
  if (scopedRoles.length === 0) return false;
  const { clubId: pathClub, assocId: pathAssoc } = pathOrgIds(currentPath);

  return scopedRoles.some((sr) => {
    if (!allowedRoles.includes(sr.role)) return false;
    if (sr.scopeType === "global") return true;

    if (pathAssoc) {
      if (sr.scopeType === "association") return sr.scopeId === pathAssoc;
      return false;
    }
    if (pathClub) {
      if (sr.scopeType === "club") return sr.scopeId === pathClub;
      if (sr.scopeType === "association") return true;
      return false;
    }
    return true;
  });
}

/**
 * Returns whether an authenticated user may access this pathname under admin/portal rules.
 * Does not handle public paths, password-change redirects, or unauthenticated users.
 */
export function evaluateAdminRouteAccess(
  pathname: string,
  session: AdminRouteSession,
): "allow" | "deny" {
  const role = session.role || "public";
  const scopedRoles = session.scopedRoles ?? [];

  for (const rule of ROUTE_RULES) {
    if (!rule.pattern.test(pathname)) continue;

    const primaryAllowed = rule.allowedRoles.includes("*") || rule.allowedRoles.includes(role);
    const scopedAllowed = hasAccessViaScopedRoles(
      rule.allowedRoles,
      pathname,
      scopedRoles,
    );

    if (!primaryAllowed && !scopedAllowed) {
      return "deny";
    }

    if (rule.scopeCheck) {
      const { clubId: pathClub, assocId: pathAssoc } = pathOrgIds(pathname);

      if (pathClub) {
        const pathClubId = pathClub;
        if (CLUB_SCOPED_ROLES.includes(role)) {
          const matchesById = session.clubId === pathClubId;
          const matchesBySlug = session.clubSlug === pathClubId;
          if (
            session.clubId &&
            !matchesById &&
            !matchesBySlug &&
            !scopedAllowed
          ) {
            return "deny";
          }
        }
      }

      if (pathAssoc) {
        const pathAssocId = pathAssoc;
        if (ASSOC_SCOPED_ROLES.includes(role)) {
          if (
            session.associationId &&
            session.associationId !== pathAssocId &&
            !scopedAllowed
          ) {
            return "deny";
          }
        }
        if (CLUB_SCOPED_ROLES.includes(role) && !scopedAllowed) {
          return "deny";
        }
      }
    }

    return "allow";
  }

  return "allow";
}

/**
 * Menu check: may a person holding any of these roles open this page? Role rules only (organisation ids
 * in the path are the API's and the page's concern), so the sidebar never offers a link that would be refused.
 */
export function canOpenAdminPath(pathname: string, roles: string[]): boolean {
  const list = roles.filter(Boolean);
  if (list.length === 0) return false;
  return evaluateAdminRouteAccess(pathname, {
    role: list[0],
    scopedRoles: list.map((role) => ({ role, scopeType: "global" as const })),
  }) === "allow";
}
