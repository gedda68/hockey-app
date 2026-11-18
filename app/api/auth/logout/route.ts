// app/api/auth/logout/route.ts
// Logout endpoint. Replies with where to send the person next: always the top-level site.
//
// The session cookie is host-only, so signing out on a club/association host leaves the top-level site's own
// cookie (from the sign-in there) alive, and the public header would still say "Logout". When the request comes
// from a tenant host, the person is therefore sent through this route's GET on the top-level site, which clears
// that cookie too and then lands on the destination.

import { NextRequest, NextResponse } from "next/server";
import { deleteSession, expiredSessionCookieHeaders } from "@/lib/auth/session";
import { logoutDestination, type LogoutTarget } from "@/lib/auth/logoutDestination";
import { buildApexSiteOrigin } from "@/lib/tenant/subdomainUrls";

function targetOf(to: unknown): LogoutTarget {
  return to === "login" ? "login" : "home";
}
function reasonOf(r: unknown): string | null {
  return typeof r === "string" ? r.slice(0, 20) : null;
}

async function clear(res: NextResponse) {
  await deleteSession();
  for (const h of expiredSessionCookieHeaders()) res.headers.append("Set-Cookie", h);
}

export async function POST(request: NextRequest) {
  let body: { to?: string; reason?: string } = {};
  try {
    body = await request.json();
  } catch {
    // no body: older callers
  }
  const target = targetOf(body.to);
  const reason = reasonOf(body.reason);
  const apexOrigin = buildApexSiteOrigin();
  const destination = logoutDestination({ target, apexOrigin, reason });

  let redirectTo = destination;
  try {
    const onApex = new URL(apexOrigin).host === request.headers.get("host");
    if (!onApex) {
      const q = new URLSearchParams({ to: target });
      if (reason) q.set("reason", reason);
      redirectTo = `${apexOrigin.replace(/\/+$/, "")}/api/auth/logout?${q}`;
    }
  } catch {
    // keep the plain destination
  }

  const res = NextResponse.json({ success: true, redirectTo });
  await clear(res);
  return res;
}

/** Top-level site: clear this host's session cookie and continue to the destination. */
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const destination = logoutDestination({
    target: targetOf(sp.get("to")),
    apexOrigin: buildApexSiteOrigin(),
    reason: reasonOf(sp.get("reason")),
  });
  const res = NextResponse.redirect(destination, 303);
  await clear(res);
  return res;
}
