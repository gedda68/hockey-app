"use client";

import { extractPortalSlugFromHost } from "@/lib/tenant/portalHost";
import { buildTenantOrigin } from "@/lib/tenant/subdomainUrls";

/**
 * After persona switch, move the browser to the host that matches the JWT
 * `portalSubdomain` (same path + query).
 */
export function syncBrowserToPortalSubdomain(
  portalSubdomain: string | null | undefined,
): void {
  if (typeof window === "undefined") return;
  const expected = portalSubdomain?.trim().toLowerCase();
  if (!expected) return;

  const current = extractPortalSlugFromHost(window.location.host);
  if (current === expected) return;

  const origin = buildTenantOrigin(expected).replace(/\/$/, "");
  const dest = `${origin}${window.location.pathname}${window.location.search}${window.location.hash}`;
  window.location.replace(dest);
}
