// middleware.ts
// Server-side route protection — runs on Edge before every request.
// Uses the same JWT secret as lib/auth/session.ts

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

// Must match lib/auth/session.ts
const SECRET_KEY = process.env.JWT_SECRET;
if (!SECRET_KEY) throw new Error("JWT_SECRET environment variable is not set");
const key = new TextEncoder().encode(SECRET_KEY);

interface SessionData {
  role: string;
  clubId?: string | null;
  clubSlug?: string | null;
  associationId?: string | null;
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

// ── Role sets ────────────────────────────────────────────────────────────────

const SUPER_ADMIN = ["super-admin"];

const ASSOCIATION_ROLES = [
  "super-admin",
  "association-admin",
];

const ASSOC_STAFF_ROLES = [
  "super-admin",
  "association-admin",
  "assoc-committee",
  "assoc-coach",
  "assoc-selector",
  "assoc-registrar",
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
  "club-admin",
  "team-selector",
  "coach",
];

// Any role that has admin-area access
const ANY_ADMIN = [
  "super-admin",
  "association-admin",
  "assoc-committee",
  "assoc-coach",
  "assoc-selector",
  "assoc-registrar",
  "club-admin",
  "club-committee",
  "registrar",
  "coach",
  "manager",
  "umpire",
  "volunteer",
  "team-selector",
];

// Portal roles — access /portal/** and their own member pages
const PORTAL_ROLES = ["player", "member", "parent", ...ANY_ADMIN];

// ── Route table ──────────────────────────────────────────────────────────────
// Checked in order — first match wins.

interface RouteRule {
  pattern: RegExp;
  allowedRoles: string[];
  /** If true, also enforce scopeId check for club/association */
  scopeCheck?: boolean;
}

const ROUTE_RULES: RouteRule[] = [
  // ── Super-admin only ────────────────────────────────────────────────────
  { pattern: /^\/admin\/dashboard(\/|$)/, allowedRoles: SUPER_ADMIN },
  { pattern: /^\/admin\/users(\/|$)/, allowedRoles: SUPER_ADMIN },
  { pattern: /^\/admin\/global-config(\/|$)/, allowedRoles: SUPER_ADMIN },
  { pattern: /^\/admin\/config(\/|$)/, allowedRoles: SUPER_ADMIN },

  // ── Association-level ────────────────────────────────────────────────────
  { pattern: /^\/admin\/settings(\/|$)/, allowedRoles: ASSOCIATION_ROLES, scopeCheck: true },
  { pattern: /^\/admin\/associations(\/|$)/, allowedRoles: ASSOCIATION_ROLES, scopeCheck: true },
  { pattern: /^\/admin\/tournaments(\/|$)/, allowedRoles: ASSOCIATION_ROLES, scopeCheck: true },

  // ── Association staff ────────────────────────────────────────────────────
  { pattern: /^\/admin\/representative(\/|$)/, allowedRoles: ASSOC_STAFF_ROLES, scopeCheck: true },

  // ── Club + association + super ────────────────────────────────────────────
  { pattern: /^\/admin\/clubs(\/|$)/, allowedRoles: CLUB_AND_ABOVE, scopeCheck: true },
  { pattern: /^\/admin\/fees(\/|$)/, allowedRoles: CLUB_AND_ABOVE, scopeCheck: true },
  { pattern: /^\/admin\/news(\/|$)/, allowedRoles: CLUB_AND_ABOVE, scopeCheck: true },

  // ── Club management ───────────────────────────────────────────────────────
  { pattern: /^\/admin\/members(\/|$)/, allowedRoles: CLUB_MANAGEMENT, scopeCheck: true },

  // ── Player / team management ──────────────────────────────────────────────
  { pattern: /^\/admin\/players(\/|$)/, allowedRoles: PLAYER_MANAGEMENT, scopeCheck: true },
  { pattern: /^\/admin\/teams(\/|$)/, allowedRoles: TEAM_STAFF, scopeCheck: true },

  // ── Nominations ───────────────────────────────────────────────────────────
  { pattern: /^\/admin\/nominations(\/|$)/, allowedRoles: NOMINATION_ACCESS, scopeCheck: true },

  // ── Catch-all admin (requires some admin role) ─────────────────────────────
  { pattern: /^\/admin(\/|$)/, allowedRoles: ANY_ADMIN },

  // ── Portal (authenticated members / players) ────────────────────────────
  { pattern: /^\/portal(\/|$)/, allowedRoles: PORTAL_ROLES },
];

// Routes that require the user to be logged in but have no role restriction
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

  // Root is always public
  if (path === "/") return true;

  return PUBLIC_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(prefix + "/") || path.startsWith(prefix + "?")
  );
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // 1. Skip fully public paths
  if (isPublicPath(path)) {
    return NextResponse.next();
  }

  // 2. Get session
  const session = await getSession(request);

  // 3. Unauthenticated — redirect to login
  if (!session) {
    // If they're trying to access a protected route, send to login
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", request.nextUrl.href);
    return NextResponse.redirect(loginUrl);
  }

  // 4. Force password change — only let through to /change-password (and all API routes)
  if (
    session.forcePasswordChange &&
    !path.startsWith("/change-password") &&
    !path.startsWith("/api/")
  ) {
    const changeUrl = new URL("/change-password", request.url);
    changeUrl.searchParams.set("force", "1");
    return NextResponse.redirect(changeUrl);
  }

  // 5. Auth-required paths (any logged-in user)
  if (AUTH_REQUIRED_PATHS.some((p) => path.startsWith(p))) {
    return NextResponse.next();
  }

  const role = session.role || "public";

  // 6. Match against route rules
  for (const rule of ROUTE_RULES) {
    if (!rule.pattern.test(path)) continue;

    // Role check
    if (!rule.allowedRoles.includes(role)) {
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }

    // Scope check — club-admin can only see their own club; association-admin their own association
    if (rule.scopeCheck) {
      const clubMatch = path.match(/\/clubs\/([^\/?\s]+)/);
      const assocMatch = path.match(/\/associations\/([^\/?\s]+)/);

      // Club-scoped path
      if (clubMatch && clubMatch[1] !== "new") {
        const pathClubId = clubMatch[1];
        // club-admin must match their own clubId or clubSlug
        if (
          role === "club-admin" ||
          role === "club-committee" ||
          role === "registrar" ||
          role === "coach" ||
          role === "manager" ||
          role === "team-selector"
        ) {
          const matchesById   = session.clubId   && session.clubId   === pathClubId;
          const matchesBySlug = session.clubSlug && session.clubSlug === pathClubId;
          if (session.clubId && !matchesById && !matchesBySlug) {
            return NextResponse.redirect(new URL("/unauthorized", request.url));
          }
        }
        // association-admin: can access any club in their association (no restriction here — DB layer handles it)
      }

      // Association-scoped path
      if (assocMatch && assocMatch[1] !== "new") {
        const pathAssocId = assocMatch[1];
        if (role === "association-admin") {
          if (session.associationId && session.associationId !== pathAssocId) {
            return NextResponse.redirect(new URL("/unauthorized", request.url));
          }
        }
        // assoc-committee, assoc-coach, assoc-selector, assoc-registrar
        if (["assoc-committee","assoc-coach","assoc-selector","assoc-registrar"].includes(role)) {
          if (session.associationId && session.associationId !== pathAssocId) {
            return NextResponse.redirect(new URL("/unauthorized", request.url));
          }
        }
      }
    }

    // Passed all checks
    return NextResponse.next();
  }

  // 7. No rule matched — allow (catch-all fallback)
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons|images|public).*)",
  ],
};
