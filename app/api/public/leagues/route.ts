// GET /api/public/leagues?season=2026&owningAssociationId=
// Epic I — list published / in-progress / completed season competitions for public hubs.

import { NextRequest, NextResponse } from "next/server";
import { listPublicLeagues } from "@/lib/public/publicLeagues";
import clientPromise from "@/lib/mongodb";
import {
  resolvePublicTenantFromRequest,
  resolveClubAssociationId,
} from "@/lib/tenant/publicTenantRequest";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const season = searchParams.get("season")?.trim() || undefined;
    let owningAssociationId =
      searchParams.get("owningAssociationId")?.trim() || undefined;

    const tenant = await resolvePublicTenantFromRequest(request);
    if (tenant) {
      const client = await clientPromise;
      const db = client.db(process.env.DB_NAME || "hockey-app");
      const tenantOwningAssociationId =
        tenant.kind === "association"
          ? tenant.id
          : await resolveClubAssociationId(db, tenant.id);

      if (tenantOwningAssociationId) {
        if (!owningAssociationId) owningAssociationId = tenantOwningAssociationId;
        if (owningAssociationId !== tenantOwningAssociationId) {
          return NextResponse.json({ leagues: [] });
        }
      }
    }

    const leagues = await listPublicLeagues({ season, owningAssociationId });
    return NextResponse.json({ leagues });
  } catch (error: unknown) {
    console.error("GET /api/public/leagues error:", error);
    return NextResponse.json(
      { error: "Failed to list leagues" },
      { status: 500 },
    );
  }
}
