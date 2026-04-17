// proxy.ts
// Server-side route protection — runs on Edge before every request.
// Uses the same JWT secret as lib/auth/session.ts

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { evaluateAdminRouteAccess } from "@/lib/auth/adminRouteAccess";
import { ssoAutoRedirectFromMiddleware } from "@/lib/auth/oidc/config";
import { tenantHostRedirectUrl } from "@/lib/tenant/middlewareTenantRedirect";
import { tryApexToTenantPublicRedirect } from "@/lib/tenant/publicApexTenantRedirect";
import {
  logPublicTelemetry,
  telemetryFromRequestLike,
} from "@/lib/observability/publicTelemetry";
import {
  RESOLVED_PORTAL_SLUG_HEADER,
  resolvePortalSlugForRequest,
} from "@/lib/tenant/portalHost";

const SECRET_KEY = process.env.JWT_SECRET;
if (!SECRET_KEY) throw new Error("JWT_SECRET environment variable is not set");
const key = new TextEncoder().encode(SECRET_KEY);

function nextWithResolvedPortalSlug(request: NextRequest): NextResponse {
  const headers = new Headers(request.headers);
  const host = headers.get("x-forwarded-host") ?? headers.get("host");
  const queryPortal = request.nextUrl.searchParams.get("portal");
  const slug = resolvePortalSlugForRequest(host, queryPortal);
  if (slug) headers.set(RESOLVED_PORTAL_SLUG_HEADER, slug);
  else headers.delete(RESOLVED_PORTAL_SLUG_HEADER);
  return NextResponse.next({ request: { headers } });
}

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
  portalSubdomain?: string | null;
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
    "/associations",
    "/play",
    "/representative",
    "/tournaments",
    "/nominate",
    "/nomination-status",
    "/clubs",
    "/officials",
    "/news",
    "/search",
    "/api/auth/login",
    "/api/auth/consume-session",
    "/api/auth/logout",
    "/api/auth/session",
    "/api/auth/me",
    "/api/auth/forgot-password",
    "/api/auth/reset-password",
    "/api/auth/switch-persona",
    "/api/auth/change-password",
    "/api/member/my-fees",
    "/api/member/my-umpire-assignments",
    "/api/member/my-roles",
    "/api/member/payments/simulate",
    "/api/clubs",
    "/api/events",
    "/api/news",
    "/api/search",
    "/api/competitions",
    "/api/fixtures",
    "/api/calendar",
    "/api/standings",
    "/api/players/lookup",
    "/api/nominations",
    "/api/nominations/windows",
    "/api/rep-nominations",
    "/api/tournaments",
    "/api/rep-tournament-fixtures",
    "/api/associations",
    "/api/public",
    "/api/rosters",
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

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const hostHeader = request.headers.get("x-forwarded-host") ?? request.headers.get("host");

  // 0. Login / auth UI — always allow (belt-and-suspenders; avoids any redirect loop if
  //    path matching or list drift ever misses `/login` or `/admin/login`).
  if (
    path === "/login" ||
    path.startsWith("/login/") ||
    path === "/admin/login" ||
    path.startsWith("/admin/login/")
  ) {
    return nextWithResolvedPortalSlug(request);
  }

  // 0.5 Apex → tenant for public org URLs (/clubs/…, /associations/…, optional fallback prefixes)
  const apexTenantRedirect = await tryApexToTenantPublicRedirect(request);
  if (apexTenantRedirect) {
    logPublicTelemetry("tenant.redirect", {
      ...telemetryFromRequestLike({ hostHeader, pathname: path }),
      kind: "apex_to_tenant",
    });
    return apexTenantRedirect;
  }

  // 1. Skip fully public paths
  if (isPublicPath(path)) return nextWithResolvedPortalSlug(request);

  // 2. Get session
  const session = await getSession(request);

  // 3. Unauthenticated → OIDC SSO (optional) or login
  if (!session) {
    if (ssoAutoRedirectFromMiddleware()) {
      const sso = new URL("/api/auth/sso", request.url);
      sso.searchParams.set("callbackUrl", request.nextUrl.href);
      return NextResponse.redirect(sso);
    }
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
  if (AUTH_REQUIRED_PATHS.some((p) => path.startsWith(p))) {
    return nextWithResolvedPortalSlug(request);
  }

  // 5b. Keep /admin and /portal on the session’s tenant host ({slug}.{root})
  const tenantRedirect = tenantHostRedirectUrl({
    pathname: path,
    search: request.nextUrl.search,
    hostHeader,
    portalSubdomain: session.portalSubdomain,
    role: session.role || "public",
  });
  if (tenantRedirect) {
    logPublicTelemetry("tenant.redirect", {
      ...telemetryFromRequestLike({ hostHeader, pathname: path }),
      kind: "admin_host_enforce",
    });
    return NextResponse.redirect(tenantRedirect);
  }

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
      logPublicTelemetry("access.deny", {
        ...telemetryFromRequestLike({ hostHeader, pathname: path }),
        isApi: true,
        role: session.role || "public",
      });
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    logPublicTelemetry("access.deny", {
      ...telemetryFromRequestLike({ hostHeader, pathname: path }),
      isApi: false,
      role: session.role || "public",
    });
    return NextResponse.redirect(new URL("/unauthorized", request.url));
  }

  return nextWithResolvedPortalSlug(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons|images|public).*)"],
};

