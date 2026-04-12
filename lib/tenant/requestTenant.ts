import type { NextRequest } from "next/server";
import clientPromise from "@/lib/mongodb";
import {
  resolvePortalSlugForRequest,
  resolveTenantByPortalSlug,
  type PublicTenantPayload,
} from "@/lib/tenant/portalHost";

/**
 * Resolve association/club tenant for a public API request (Host + optional ?portal=).
 */
export async function getPublicTenantFromRequest(
  request: NextRequest,
): Promise<PublicTenantPayload | null> {
  const host =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    "";
  const queryPortal = request.nextUrl.searchParams.get("portal");
  const slug = resolvePortalSlugForRequest(host, queryPortal);
  if (!slug) return null;
  const client = await clientPromise;
  const db = client.db(process.env.DB_NAME || "hockey-app");
  return resolveTenantByPortalSlug(db, slug);
}
