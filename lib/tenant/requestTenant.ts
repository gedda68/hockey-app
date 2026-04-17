import type { NextRequest } from "next/server";
import clientPromise from "@/lib/mongodb";
import {
  logPublicTelemetry,
  telemetryFromRequestLike,
} from "@/lib/observability/publicTelemetry";
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
  if (!slug) {
    // Only log if this looks like a tenant attempt (subdomain-ish) or a portal query was provided.
    if (String(queryPortal ?? "").trim()) {
      logPublicTelemetry("tenant.resolve.no_slug", {
        ...telemetryFromRequestLike({
          hostHeader: host,
          pathname: request.nextUrl.pathname,
        }),
        hadPortalQuery: true,
      });
    }
    return null;
  }
  const client = await clientPromise;
  const db = client.db(process.env.DB_NAME || "hockey-app");
  const tenant = await resolveTenantByPortalSlug(db, slug);
  if (!tenant) {
    logPublicTelemetry("tenant.resolve.not_found", {
      ...telemetryFromRequestLike({
        hostHeader: host,
        pathname: request.nextUrl.pathname,
      }),
      slug,
    });
  }
  return tenant;
}
