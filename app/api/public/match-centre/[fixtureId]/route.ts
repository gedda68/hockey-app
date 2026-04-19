// GET /api/public/match-centre/[fixtureId]
// Epic O1 — JSON snapshot for public match centre (tenant-gated); used for short polling.

import { NextRequest, NextResponse } from "next/server";
import { getPublicMatchCentreById } from "@/lib/data/matches";
import { getPublicTenantFromRequest } from "@/lib/tenant/requestTenant";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fixtureId: string }> },
) {
  try {
    const { fixtureId } = await params;
    const id = fixtureId?.trim() ?? "";
    if (!id) {
      return NextResponse.json({ error: "fixtureId required" }, { status: 400 });
    }

    const tenant = await getPublicTenantFromRequest(request);
    const centre = await getPublicMatchCentreById(id, tenant);
    if (!centre) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(centre, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    console.error("GET /api/public/match-centre/[fixtureId]:", e);
    return NextResponse.json(
      { error: "Failed to load match centre" },
      { status: 500 },
    );
  }
}
