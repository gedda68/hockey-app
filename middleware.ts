// middleware.ts
// Server-side route protection — runs on Edge before every request.
// Uses the same JWT secret as lib/auth/session.ts

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { evaluateAdminRouteAccess } from "@/lib/auth/adminRouteAccess";

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
    "/api/events",
    "/api/news",
    "/api/competitions",
    "/api/fixtures",
    "/api/standings",
    "/api/players/lookup",
    "/api/nominations",
    "/api/nominations/windows",
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
    (prefix) =>
      path === prefix ||
      path.startsWith(prefix + "/") ||
      path.startsWith(prefix + "?"),
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
  if (AUTH_REQUIRED_PATHS.some((p) => path.startsWith(p)))
    return NextResponse.next();

  // 6. Admin + portal route RBAC (see lib/auth/adminRouteAccess.ts)
  const decision = evaluateAdminRouteAccess(path, {
    role: session.role || "public",
    scopedRoles: session.scopedRoles,
    associationId: session.associationId,
    clubId: session.clubId,
    clubSlug: session.clubSlug,
  });

  if (decision === "deny") {
    if (path.startsWith("/api/")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/unauthorized", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons|images|public).*)",
  ],
};
