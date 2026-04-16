import { NextRequest, NextResponse } from "next/server";
import {
  attachSessionCookieHostOnly,
  decodeSessionToken,
} from "@/lib/auth/session";

function sanitizeNext(raw: string | null): string {
  if (!raw?.trim()) return "/";
  const t = raw.trim();
  // Only allow site-relative redirects (open-redirect safe)
  if (!t.startsWith("/") || t.startsWith("//")) return "/";
  return t;
}

/**
 * Establish the HttpOnly session cookie on the CURRENT host (e.g. hq.localhost)
 * and then redirect to the intended in-app path.
 *
 * This is used for local multi-tenant dev where cookies set on `localhost`
 * are not reliably available on `*.localhost` across browsers.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const next = sanitizeNext(request.nextUrl.searchParams.get("next"));

  if (!token?.trim()) {
    return NextResponse.redirect(new URL(`/login?error=missing_token`, request.url));
  }

  const session = await decodeSessionToken(token.trim());
  if (!session) {
    return NextResponse.redirect(new URL(`/login?error=invalid_token`, request.url));
  }

  const dest = new URL(next, request.url);
  const res = NextResponse.redirect(dest);
  await attachSessionCookieHostOnly(res, session);
  return res;
}

