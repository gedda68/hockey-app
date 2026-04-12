import { headers } from "next/headers";
import clientPromise from "@/lib/mongodb";
import {
  resolvePortalSlugForRequest,
  resolveTenantByPortalSlug,
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
