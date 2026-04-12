import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import {
  resolvePortalSlugForRequest,
  resolveTenantByPortalSlug,
} from "@/lib/tenant/portalHost";

/**
 * Public tenant branding for the current Host (subdomain portal).
 * No authentication. Safe fields only.
 */
export async function GET(request: NextRequest) {
  try {
    const host =
      request.headers.get("x-forwarded-host") ||
      request.headers.get("host") ||
      "";
    const queryPortal = request.nextUrl.searchParams.get("portal");
    const slug = resolvePortalSlugForRequest(host, queryPortal);
    if (!slug) {
      return NextResponse.json({ tenant: null, portalSlug: null });
    }

    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || "hockey-app");
    const tenant = await resolveTenantByPortalSlug(db, slug);

    if (!tenant) {
      return NextResponse.json({ tenant: null, portalSlug: slug });
    }

    return NextResponse.json({ tenant, portalSlug: slug });
  } catch (e) {
    console.error("GET /api/public/tenant:", e);
    return NextResponse.json(
      { error: "Failed to resolve tenant" },
      { status: 500 },
    );
  }
}
