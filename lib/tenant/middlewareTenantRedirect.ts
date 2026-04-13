import { extractPortalSlugFromHost } from "@/lib/tenant/portalHost";
import { buildTenantOrigin } from "@/lib/tenant/subdomainUrls";

/**
 * If the session belongs on a tenant host ({portalSubdomain}.{root}) but the
 * request hit apex or another tenant, return the absolute URL to redirect to.
 */
export function tenantHostRedirectUrl(opts: {
  pathname: string;
  search: string;
  hostHeader: string | null;
  portalSubdomain: string | null | undefined;
  role: string;
}): URL | null {
  const { pathname, search, hostHeader, portalSubdomain, role } = opts;
  if (role === "super-admin") return null;
  const expected = portalSubdomain?.trim().toLowerCase();
  if (!expected) return null;

  if (!pathname.startsWith("/admin") && !pathname.startsWith("/portal")) {
    return null;
  }
  if (pathname.startsWith("/admin/login")) return null;

  const current = extractPortalSlugFromHost(hostHeader);
  if (current === expected) return null;

  const origin = buildTenantOrigin(expected);
  const base = origin.endsWith("/") ? origin : `${origin}/`;
  return new URL(`${pathname}${search}`, base);
}
