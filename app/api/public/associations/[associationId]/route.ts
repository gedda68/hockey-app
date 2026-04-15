// GET /api/public/associations/[associationId]
// Epic I — minimal public association profile for hub pages (no auth secrets).

import { NextRequest, NextResponse } from "next/server";
import { getPublicAssociationById } from "@/lib/public/publicAssociation";
import { resolvePublicTenantFromRequest } from "@/lib/tenant/publicTenantRequest";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ associationId: string }> },
) {
  try {
    const { associationId } = await params;
    if (!associationId?.trim()) {
      return NextResponse.json({ error: "associationId required" }, { status: 400 });
    }

    const tenant = await resolvePublicTenantFromRequest(request);
    if (tenant?.kind === "association" && tenant.id !== associationId.trim()) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (tenant?.kind === "club") {
      // Club portals should not fetch arbitrary association profiles.
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const profile = await getPublicAssociationById(associationId.trim());
    if (!profile) {
      return NextResponse.json({ error: "Association not found" }, { status: 404 });
    }

    return NextResponse.json(profile);
  } catch (error: unknown) {
    console.error("GET /api/public/associations/[associationId] error:", error);
    return NextResponse.json(
      { error: "Failed to load association" },
      { status: 500 },
    );
  }
}
