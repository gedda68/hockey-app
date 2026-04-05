// middleware.ts
// Server-side route protection — runs on Edge before every request.
// Uses the same JWT secret as lib/auth/session.ts

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SECRET_KEY = process.env.JWT_SECRET;
if (!SECRET_KEY) throw new Error("JWT_SECRET environment variable is not set");
const key = new TextEncoder().encode(SECRET_KEY);

interface ScopedRole {
  role: string;
  scopeType: "global" | "association" | "club" | "team";
  scopeId?: string;
}

interface SessionData {
  role: string;
  scopedRoles?: ScopedRole[];
  associationId?: string | null;
  associationLevel?: "national" | "state" | "city" | "district";
  clubId?: string | null;
  clubSlug?: string | null;
  memberId?: string | null;
  forcePasswordChange?: boolean;
}

async function getSession(req: NextRequest): Promise<SessionData | null> {
  const token = req.cookies.get("session")?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] });
    return payload as unknown as SessionData;
  } catch {
    return null;
  }
}

// ── Role sets ─────────────────────────────────────────────────────────────────
// Keep in sync with menuConfig.ts and AuthContext.tsx

const SUPER_ADMIN = ["super-admin"];

const ASSOCIATION_ROLES = [
  "super-admin",
  "association-admin",
];

/** All association-level staff (includes media-marketing) */
const ASSOC_STAFF_ROLES = [
  "super-admin",
  "association-admin",
  "assoc-committee",
  "assoc-coach",
  "assoc-selector",
  "assoc-registrar",
  "media-marketing",
];

const CLUB_AND_ABOVE = [
  "super-admin",
  "association-admin",
  "club-admin",
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

/** Any role that has admin-area access */
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

/** Portal roles — access /portal/** and personal pages */
const PORTAL_ROLES = ["player", "member", "parent", ...ANY_ADMIN];

// ── Route table ───────────────────────────────────────────────────────────────
// Checked in order — first match wins.

interface RouteRule {
  pattern: RegExp;
  allowedRoles: string[];
  /** If true, also enforce scopeId check for club/association paths */
  scopeCheck?: boolean;
}

const ROUTE_RULES: RouteRule[] = [
  // ── Super-admin only ──────────────────────────────────────────────────────
  { pattern: /^\/admin\/users(\/|$)/,        allowedRoles: SUPER_ADMIN },
  { pattern: /^\/admin\/global-config(\/|$)/,allowedRoles: SUPER_ADMIN },
  { pattern: /^\/admin\/config(\/|$)/,       allowedRoles: SUPER_ADMIN },
  { pattern: /^\/admin\/dashboard(\/|$)/,    allowedRoles: SUPER_ADMIN },

  // ── Association-level ──────────────────────────────────────────────────────
  { pattern: /^\/admin\/settings(\/|$)/,     allowedRoles: SETTINGS_ROLES,    scopeCheck: true },
  { pattern: /^\/admin\/associations(\/|$)/, allowedRoles: ASSOCIATION_ROLES, scopeCheck: true },
  { pattern: /^\/admin\/tournaments(\/|$)/,  allowedRoles: ASSOCIATION_ROLES, scopeCheck: true },

  // ── Association staff ──────────────────────────────────────────────────────
  { pattern: /^\/admin\/representative(\/|$)/, allowedRoles: ASSOC_STAFF_ROLES, scopeCheck: true },

  // ── News / Media ───────────────────────────────────────────────────────────
  { pattern: /^\/admin\/news(\/|$)/, allowedRoles: [
    "super-admin",
    "association-admin", "assoc-committee", "media-marketing",
    "club-admin", "club-committee",
  ]},

  // ── Club + association + super ─────────────────────────────────────────────
  { pattern: /^\/admin\/clubs(\/|$)/,        allowedRoles: CLUB_AND_ABOVE,   scopeCheck: true },
  { pattern: /^\/admin\/fees(\/|$)/,         allowedRoles: FINANCE_ROLES,    scopeCheck: true },

  // ── Club management ────────────────────────────────────────────────────────
  { pattern: /^\/admin\/members(\/|$)/,      allowedRoles: CLUB_MANAGEMENT,  scopeCheck: true },

  // ── Player / team management ───────────────────────────────────────────────
  { pattern: /^\/admin\/players(\/|$)/,      allowedRoles: PLAYER_MANAGEMENT, scopeCheck: true },
  { pattern: /^\/admin\/teams(\/|$)/,        allowedRoles: TEAM_STAFF,        scopeCheck: true },

  // ── Nominations ────────────────────────────────────────────────────────────
  { pattern: /^\/admin\/nominations(\/|$)/, allowedRoles: NOMINATION_ACCESS, scopeCheck: true },

  // ── My personal pages — accessible to all authenticated users ─────────────
  { pattern: /^\/admin\/my-registrations(\/|$)/, allowedRoles: PORTAL_ROLES },
  { pattern: /^\/admin\/my-fees(\/|$)/,           allowedRoles: PORTAL_ROLES },

  // ── Role approval / expiry management ─────────────────────────────────────
  { pattern: /^\/admin\/role-requests(\/|$)/, allowedRoles: [
    "super-admin",
    "association-admin", "assoc-registrar",
    "club-admin", "registrar",
  ]},
  { pattern: /^\/admin\/role-expiry(\/|$)/, allowedRoles: [
    "super-admin",
    "association-admin",
    "club-admin", "registrar",
  ]},

  // ── Team tournament fees ───────────────────────────────────────────────────
  { pattern: /^\/admin\/team-tournaments(\/|$)/, allowedRoles: [
    "super-admin",
    "association-admin", "assoc-registrar",
    "club-admin", "registrar",
  ], scopeCheck: true },

  // ── Bulk import ────────────────────────────────────────────────────────────
  { pattern: /^\/admin\/bulk-import(\/|$)/, allowedRoles: CLUB_AND_ABOVE },

  // ── Catch-all admin (requires some admin role) ─────────────────────────────
  { pattern: /^\/admin(\/|$)/, allowedRoles: ANY_ADMIN },

  // ── Portal (authenticated members / players) ───────────────────────────────
  { pattern: /^\/portal(\/|$)/, allowedRoles: PORTAL_ROLES },
];

// Routes requiring login but no role restriction
const AUTH_REQUIRED_PATHS = ["/change-password"];

// Fully public paths — skip all auth checks
function isPublicPath(path: string): boolean {
  const PUBLIC_PREFIXES = [
    "/login",
    "/",
    "/contact",
    "/about",
    "/competitions",
    "/play",
    "/representative",
    "/nominate",
    "/nomination-status",
    "/clubs",
    "/officials",
    "/news",
    "/api/auth/login",
    "/api/auth/logout",
    "/api/auth/session",
    "/api/auth/me",
    "/api/auth/change-password",
    "/api/member/my-fees",
    "/api/member/my-roles",
    "/api/member/payments/simulate",
    "/api/clubs",
    "/api/competitions",
    "/api/players/lookup",
    "/api/nominations",
    "/api/rep-nominations",
    "/api/tournaments",
    "/api/associations",
    "/_next",
    "/favicon",
    "/icons",
    "/images",
    "/public",
  ];

  if (path === "/") return true;
  return PUBLIC_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(prefix + "/") || path.startsWith(prefix + "?")
  );
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // 1. Skip fully public paths
  if (isPublicPath(path)) return NextResponse.next();

  // 2. Get session
  const session = await getSession(request);

  // 3. Unauthenticated → redirect to login
  if (!session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", request.nextUrl.href);
    return NextResponse.redirect(loginUrl);
  }

  // 4. Force password change
  if (
    session.forcePasswordChange &&
    !path.startsWith("/change-password") &&
    !path.startsWith("/api/")
  ) {
    const changeUrl = new URL("/change-password", request.url);
    changeUrl.searchParams.set("force", "1");
    return NextResponse.redirect(changeUrl);
  }

  // 5. Auth-required (any logged-in user)
  if (AUTH_REQUIRED_PATHS.some((p) => path.startsWith(p))) return NextResponse.next();

  const role       = session.role || "public";
  const scopedRoles = session.scopedRoles ?? [];

  // ── Helpers ──────────────────────────────────────────────────────────────────

  /**
   * True if ANY scoped role in the session satisfies allowedRoles AND is correctly
   * scoped to the association or club referenced in the path.
   * Handles multi-role members whose primary role is lower-privilege.
   */
  function hasAccessViaScopedRoles(allowedRoles: string[], currentPath: string): boolean {
    if (scopedRoles.length === 0) return false;
    const clubMatch  = currentPath.match(/\/clubs\/([^/?\s]+)/);
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
        if (sr.scopeType === "association") return true; // DB enforces further
        return false;
      }
      // Non-scoped path — any matching role passes
      return true;
    });
  }

  // Club-level roles restricted to their own club
  const CLUB_SCOPED_ROLES = [
    "club-admin", "club-committee", "registrar", "coach", "manager",
    "team-selector", "volunteer", "umpire", "technical-official",
  ];

  // Association-level roles restricted to their own association
  const ASSOC_SCOPED_ROLES = [
    "association-admin", "assoc-committee", "assoc-coach",
    "assoc-selector", "assoc-registrar", "media-marketing",
  ];

  // 6. Match against route rules
  for (const rule of ROUTE_RULES) {
    if (!rule.pattern.test(path)) continue;

    // Role check: primary OR scoped role must qualify
    const primaryAllowed = rule.allowedRoles.includes(role);
    const scopedAllowed  = hasAccessViaScopedRoles(rule.allowedRoles, path);

    if (!primaryAllowed && !scopedAllowed) {
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }

    // Scope check: prevent cross-club / cross-association access
    if (rule.scopeCheck) {
      const clubMatch  = path.match(/\/clubs\/([^/?\s]+)/);
      const assocMatch = path.match(/\/associations\/([^/?\s]+)/);

      // Club-scoped path
      if (clubMatch && clubMatch[1] !== "new") {
        const pathClubId = clubMatch[1];
        if (CLUB_SCOPED_ROLES.includes(role)) {
          const matchesById   = session.clubId    === pathClubId;
          const matchesBySlug = session.clubSlug  === pathClubId;
          if (session.clubId && !matchesById && !matchesBySlug && !scopedAllowed) {
            return NextResponse.redirect(new URL("/unauthorized", request.url));
          }
        }
      }

      // Association-scoped path
      if (assocMatch && assocMatch[1] !== "new") {
        const pathAssocId = assocMatch[1];
        if (ASSOC_SCOPED_ROLES.includes(role)) {
          if (session.associationId && session.associationId !== pathAssocId && !scopedAllowed) {
            return NextResponse.redirect(new URL("/unauthorized", request.url));
          }
        }
        // Club-only roles cannot reach association paths (unless they have a scoped assoc role)
        if (CLUB_SCOPED_ROLES.includes(role) && !scopedAllowed) {
          return NextResponse.redirect(new URL("/unauthorized", request.url));
        }
      }
    }

    return NextResponse.next();
  }

  // 7. No rule matched — allow
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons|images|public).*)",
  ],
};
