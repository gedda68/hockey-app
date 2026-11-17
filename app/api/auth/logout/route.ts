// app/api/auth/logout/route.ts
// Logout endpoint. Replies with where to send the person next: the club / association site they were using
// (worked out from the session before it is deleted), not the generic base site.

import { NextRequest, NextResponse } from "next/server";
import { deleteSession, getSession } from "@/lib/auth/session";
import { logoutDestination, type LogoutTarget } from "@/lib/auth/logoutDestination";
import { buildTenantOrigin } from "@/lib/tenant/subdomainUrls";

export async function POST(request: NextRequest) {
  const session = await getSession().catch(() => null);

  let body: { to?: string; pathname?: string; search?: string; reason?: string } = {};
  try {
    body = await request.json();
  } catch {
    // no body: older callers
  }
  const target: LogoutTarget = body.to === "login" ? "login" : "home";

  const redirectTo = logoutDestination({
    target,
    hostHeader: request.headers.get("x-forwarded-host") ?? request.headers.get("host"),
    pathname: typeof body.pathname === "string" ? body.pathname.slice(0, 300) : null,
    search: typeof body.search === "string" ? body.search.slice(0, 300) : null,
    reason: typeof body.reason === "string" ? body.reason.slice(0, 20) : null,
    session: session
      ? {
          portalSubdomain: session.portalSubdomain,
          clubSlug: session.clubSlug,
          associationId: session.associationId,
        }
      : null,
    tenantOrigin: buildTenantOrigin,
  });

  await deleteSession();
  return NextResponse.json({ success: true, redirectTo });
}
