// GET /api/public/leagues?season=2026&owningAssociationId=
// Epic I — list published / in-progress / completed season competitions for public hubs.

import { NextRequest, NextResponse } from "next/server";
import { listPublicLeagues } from "@/lib/public/publicLeagues";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const season = searchParams.get("season")?.trim() || undefined;
    const owningAssociationId =
      searchParams.get("owningAssociationId")?.trim() || undefined;

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
