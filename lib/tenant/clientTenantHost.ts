"use client";

import { extractPortalSlugFromHost } from "@/lib/tenant/portalHost";
import { buildTenantOrigin } from "@/lib/tenant/subdomainUrls";

/**
 * After a persona switch, move the browser to the host that matches the session's `portalSubdomain`.
 * The session cookie is host-only, so the new host gets the session through /api/auth/consume-session
 * (which sets the cookie there) and then opens `next`. Returns true when the browser is being moved.
 */
export function syncBrowserToPortalSubdomain(
  portalSubdomain: string | null | undefined,
  sessionJwt?: string | null,
  next = "/admin/dashboard",
): boolean {
  if (typeof window === "undefined") return false;
  const expected = portalSubdomain?.trim().toLowerCase();
  if (!expected) return false;

  const current = extractPortalSlugFromHost(window.location.host);
  if (current === expected) return false;

  const origin = buildTenantOrigin(expected).replace(/\/$/, "");
  const dest = sessionJwt
    ? `${origin}/api/auth/consume-session?token=${encodeURIComponent(sessionJwt)}&next=${encodeURIComponent(next)}`
    : `${origin}${next}`;
  window.location.replace(dest);
  return true;
}
