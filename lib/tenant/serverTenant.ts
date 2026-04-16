import { cache } from "react";
import { headers } from "next/headers";
import clientPromise from "@/lib/mongodb";
import {
  RESOLVED_PORTAL_SLUG_HEADER,
  resolvePortalSlugForRequest,
  resolveTenantByPortalSlug,
  sanitizeDevPortalToken,
  type PublicTenantPayload,
} from "@/lib/tenant/portalHost";

/**
 * Resolve portal tenant in a Server Component (Host + optional ?portal=).
 */
export async function getPublicTenantForServerPage(
  searchParams: Record<string, string | string[] | undefined>,
): Promise<PublicTenantPayload | null> {
  const headersList = await headers();
  const host =
    headersList.get("x-forwarded-host") ?? headersList.get("host") ?? "";
  const queryPortal =
    typeof searchParams.portal === "string" ? searchParams.portal : null;
  const slug = resolvePortalSlugForRequest(host, queryPortal);
  if (!slug) return null;
  const client = await clientPromise;
  const db = client.db(process.env.DB_NAME || "hockey-app");
  return resolveTenantByPortalSlug(db, slug);
}

/**
 * Host-only tenant (no `?portal=`). Used in the root layout so navbar / body padding
 * match the subdomain on first paint; client `PublicTenantProvider` still refreshes for
 * plain localhost + `?portal=` overrides.
 */
export const loadPublicTenantFromIncomingHost = cache(
  async (): Promise<PublicTenantPayload | null> => {
    const headersList = await headers();
    const host =
      headersList.get("x-forwarded-host") ?? headersList.get("host") ?? "";
    const fromMiddleware = sanitizeDevPortalToken(
      headersList.get(RESOLVED_PORTAL_SLUG_HEADER),
    );
    const slug =
      fromMiddleware ?? resolvePortalSlugForRequest(host, null);
    if (!slug) return null;
    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || "hockey-app");
    return resolveTenantByPortalSlug(db, slug);
  },
);
