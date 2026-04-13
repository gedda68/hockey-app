import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  extractPortalSlugFromHost,
} from "@/lib/tenant/portalHost";
import { buildTenantOrigin } from "@/lib/tenant/subdomainUrls";

const APEX_FALLBACK_PREFIXES = [
  "/competitions",
  "/tournaments",
  "/nominate",
  "/nomination-status",
  "/representative",
  "/news",
  "/officials",
  "/play",
  "/shop",
  "/my-umpiring",
] as const;

function pathMatchesPrefix(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(`${prefix}/`);
}

/**
 * When the request hits apex (no tenant subdomain), move “org” public URLs onto
 * the correct {portal}.{root} host. Runs before the blanket public-path bypass in middleware.
 */
export async function tryApexToTenantPublicRedirect(
  request: NextRequest,
): Promise<NextResponse | null> {
  const path = request.nextUrl.pathname;
  const search = request.nextUrl.search;
  const host = request.headers.get("host");

  if (path.startsWith("/api/") || path.startsWith("/_next")) return null;

  if (extractPortalSlugFromHost(host)) return null;

  const originBase = new URL(request.url).origin;

  const redirectToSlug = (portalSlug: string) => {
    const tenantOrigin = buildTenantOrigin(portalSlug);
    const base = tenantOrigin.endsWith("/") ? tenantOrigin : `${tenantOrigin}/`;
    return NextResponse.redirect(new URL(`${path}${search}`, base));
  };

  const clubMatch = /^\/clubs\/([^/]+)/.exec(path);
  if (clubMatch) {
    const seg = clubMatch[1];
    if (seg && seg !== "new") {
      try {
        const url = new URL(
          `${originBase}/api/public/resolve-portal-host?clubsSegment=${encodeURIComponent(seg)}`,
        );
        const ac = new AbortController();
        const to = setTimeout(() => ac.abort(), 8000);
        const r = await fetch(url.toString(), {
          headers: { Accept: "application/json" },
          signal: ac.signal,
        }).finally(() => clearTimeout(to));
        if (r.ok) {
          const j = (await r.json()) as { portalSlug?: string | null };
          if (j.portalSlug) return redirectToSlug(j.portalSlug);
        }
      } catch {
        /* ignore — stay on apex */
      }
    }
  }

  const assocMatch = /^\/associations\/([^/]+)/.exec(path);
  if (assocMatch) {
    const seg = assocMatch[1];
    if (seg) {
      try {
        const url = new URL(
          `${originBase}/api/public/resolve-portal-host?associationKey=${encodeURIComponent(seg)}`,
        );
        const ac = new AbortController();
        const to = setTimeout(() => ac.abort(), 8000);
        const r = await fetch(url.toString(), {
          headers: { Accept: "application/json" },
          signal: ac.signal,
        }).finally(() => clearTimeout(to));
        if (r.ok) {
          const j = (await r.json()) as { portalSlug?: string | null };
          if (j.portalSlug) return redirectToSlug(j.portalSlug);
        }
      } catch {
        /* ignore */
      }
    }
  }

  const fallback =
    process.env.NEXT_PUBLIC_APEX_PUBLIC_FALLBACK_PORTAL?.trim().toLowerCase();
  if (fallback) {
    for (const prefix of APEX_FALLBACK_PREFIXES) {
      if (pathMatchesPrefix(path, prefix)) {
        return redirectToSlug(fallback);
      }
    }
  }

  return null;
}
