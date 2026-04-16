/**
 * Build absolute URLs for club / association tenant hosts (Option C: {sub}.{root}).
 *
 * Env:
 *   NEXT_PUBLIC_PORTAL_ROOT_DOMAIN — e.g. sportsolutions.com.au or localhost:3000 (no scheme)
 *   NEXT_PUBLIC_PORTAL_PROTOCOL — optional; default https in production, http in development
 */

import {
  extractPortalSlugFromHost,
  getPortalRootDomain,
} from "@/lib/tenant/portalHost";
import {
  associationPortalSubdomain,
  clubPortalSubdomain,
} from "@/lib/tenant/portalLabels";

export function getPortalProtocol(): string {
  const p = process.env.NEXT_PUBLIC_PORTAL_PROTOCOL?.trim();
  if (p) return p.replace(/:+$/, "");
  return process.env.NODE_ENV === "production" ? "https" : "http";
}

/** Apex site (no tenant subdomain), for “all clubs” from a club portal. */
export function buildApexSiteOrigin(): string {
  const proto = getPortalProtocol();
  const root = getPortalRootDomain().toLowerCase();
  const m = /^([^:]+)(?::(\d+))?$/.exec(root);
  const host = m?.[1] ?? root;
  const port = m?.[2];
  return port ? `${proto}://${host}:${port}` : `${proto}://${host}`;
}

/** e.g. `http://hq.localhost:3000` → `hq` (uses same rules as request Host parsing). */
export function extractPortalSlugFromTenantOrigin(origin: string): string | null {
  try {
    return extractPortalSlugFromHost(new URL(origin).host);
  } catch {
    return null;
  }
}

/**
 * Tenant origin: chc + localhost:3000 → http://chc.localhost:3000
 */
export function buildTenantOrigin(subdomain: string): string {
  const sub = subdomain.trim().toLowerCase();
  if (!sub) return buildApexSiteOrigin();
  const proto = getPortalProtocol();
  const root = getPortalRootDomain().toLowerCase();
  const m = /^([^:]+)(?::(\d+))?$/.exec(root);
  const host = m?.[1] ?? root;
  const port = m?.[2];
  const h = `${sub}.${host}`;
  return port ? `${proto}://${h}:${port}` : `${proto}://${h}`;
}

/** Path under /clubs/{slug}/… (canonical route param). */
export function clubSitePath(slug: string, suffix: string = "/"): string {
  const s = suffix === "" || suffix === "/" ? "" : suffix.startsWith("/") ? suffix : `/${suffix}`;
  if (s === "" || s === "/") return `/clubs/${slug}`;
  return `/clubs/${slug}${s}`;
}

/** Club portal home is tenant root: http://chc.localhost:3000/ */
export function clubPortalHomeUrl(club: Parameters<typeof clubPortalSubdomain>[0]): string {
  const origin = buildTenantOrigin(clubPortalSubdomain(club));
  return `${origin}/`;
}

/** Absolute URL for a club page on its tenant host. */
export function clubPortalPageUrl(
  club: Parameters<typeof clubPortalSubdomain>[0] & { slug?: string | null },
  suffix: string = "/",
): string {
  const slug = String(club.slug || "");
  if (!slug) return clubPortalHomeUrl(club);
  const origin = buildTenantOrigin(clubPortalSubdomain(club));
  return `${origin}${clubSitePath(slug, suffix)}`;
}

export function associationPortalHomeUrl(
  assoc: Parameters<typeof associationPortalSubdomain>[0],
): string {
  return `${buildTenantOrigin(associationPortalSubdomain(assoc))}/`;
}

export function associationPortalPageUrl(
  assoc: Parameters<typeof associationPortalSubdomain>[0],
  suffix: string = "/",
): string {
  const origin = buildTenantOrigin(associationPortalSubdomain(assoc));
  const path = suffix === "/" || suffix === "" ? "/" : suffix.startsWith("/") ? suffix : `/${suffix}`;
  return `${origin}${path}`;
}
