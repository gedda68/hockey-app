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

const ASSOC_STAFF_ROLES = [
  "super-admin",
  "association-admin",
  "assoc-committee",
  "assoc-coach",
  "assoc-selector",
  "assoc-registrar",
  "media-marketing",
];

const CLUB_AND_ABOVE = ["super-admin", "association-admin", "club-admin"];

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

const ANY_ADMIN = [
  "super-admin",
  "association-admin",
  "assoc-committee",
  "assoc-coach",
  "assoc-selector",
  "assoc-registrar",
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

interface RouteRule {
  pattern: RegExp;
  allowedRoles: string[];
  scopeCheck?: boolean;
}

const ROUTE_RULES: RouteRule[] = [
  { pattern: /^\/admin\/users(\/|$)/, allowedRoles: SUPER_ADMIN },
  { pattern: /^\/admin\/global-config(\/|$)/, allowedRoles: SUPER_ADMIN },
  { pattern: /^\/admin\/config(\/|$)/, allowedRoles: SUPER_ADMIN },

  { pattern: /^\/admin\/dashboard(\/|$)/, allowedRoles: ANY_ADMIN },
  { pattern: /^\/admin\/reports(\/|$)/, allowedRoles: ANY_ADMIN },

  { pattern: /^\/admin\/settings(\/|$)/, allowedRoles: SETTINGS_ROLES, scopeCheck: true },
  { pattern: /^\/admin\/associations(\/|$)/, allowedRoles: ASSOCIATION_ROLES, scopeCheck: true },
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

  { pattern: /^\/admin\/clubs(\/|$)/, allowedRoles: CLUB_AND_ABOVE, scopeCheck: true },
  { pattern: /^\/admin\/fees(\/|$)/, allowedRoles: FINANCE_ROLES, scopeCheck: true },

  { pattern: /^\/admin\/members(\/|$)/, allowedRoles: CLUB_MANAGEMENT, scopeCheck: true },

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

  { pattern: /^\/admin\/my-registrations(\/|$)/, allowedRoles: PORTAL_ROLES },
  { pattern: /^\/admin\/my-fees(\/|$)/, allowedRoles: PORTAL_ROLES },

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

  { pattern: /^\/admin\/bulk-import(\/|$)/, allowedRoles: CLUB_AND_ABOVE },

  { pattern: /^\/admin(\/|$)/, allowedRoles: ANY_ADMIN },

  { pattern: /^\/portal(\/|$)/, allowedRoles: PORTAL_ROLES },
];

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
  "media-marketing",
];

function hasAccessViaScopedRoles(
  allowedRoles: string[],
  currentPath: string,
  scopedRoles: AdminRouteScopedRole[],
): boolean {
  if (scopedRoles.length === 0) return false;
  const clubMatch = currentPath.match(/\/clubs\/([^/?\s]+)/);
  const assocMatch = currentPath.match(/\/associations\/([^/?\s]+)/);

  return scopedRoles.some((sr) => {
    if (!allowedRoles.includes(sr.role)) return false;
    if (sr.scopeType === "global") return true;

    if (assocMatch && assocMatch[1] !== "new") {
      if (sr.scopeType === "association") return sr.scopeId === assocMatch[1];
      return false;
    }
    if (clubMatch && clubMatch[1] !== "new") {
      if (sr.scopeType === "club") return sr.scopeId === clubMatch[1];
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

    const primaryAllowed = rule.allowedRoles.includes(role);
    const scopedAllowed = hasAccessViaScopedRoles(
      rule.allowedRoles,
      pathname,
      scopedRoles,
    );

    if (!primaryAllowed && !scopedAllowed) {
      return "deny";
    }

    if (rule.scopeCheck) {
      const clubMatch = pathname.match(/\/clubs\/([^/?\s]+)/);
      const assocMatch = pathname.match(/\/associations\/([^/?\s]+)/);

      if (clubMatch && clubMatch[1] !== "new") {
        const pathClubId = clubMatch[1];
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

      if (assocMatch && assocMatch[1] !== "new") {
        const pathAssocId = assocMatch[1];
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
