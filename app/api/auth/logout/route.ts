// app/api/auth/logout/route.ts
// Logout endpoint. Replies with where to send the person next: always the top-level site.

import { NextRequest, NextResponse } from "next/server";
import { deleteSession } from "@/lib/auth/session";
import { logoutDestination, type LogoutTarget } from "@/lib/auth/logoutDestination";
import { buildApexSiteOrigin } from "@/lib/tenant/subdomainUrls";

export async function POST(request: NextRequest) {
  let body: { to?: string; reason?: string } = {};
  try {
    body = await request.json();
  } catch {
    // no body: older callers
  }
  const target: LogoutTarget = body.to === "login" ? "login" : "home";

  const redirectTo = logoutDestination({
    target,
    apexOrigin: buildApexSiteOrigin(),
    reason: typeof body.reason === "string" ? body.reason.slice(0, 20) : null,
  });

  await deleteSession();
  return NextResponse.json({ success: true, redirectTo });
}
