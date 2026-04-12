// GET /api/public/tournaments?season=2026
// Epic I — list representative tournaments for public discovery (no admin RBAC).

import { NextRequest, NextResponse } from "next/server";
import { listPublicTournaments } from "@/lib/public/publicTournaments";

export async function GET(request: NextRequest) {
  try {
    const season = request.nextUrl.searchParams.get("season")?.trim();
    const tournaments = await listPublicTournaments({
      season: season || undefined,
    });
    return NextResponse.json({ tournaments });
  } catch (error: unknown) {
    console.error("GET /api/tournaments error:", error);
    return NextResponse.json(
      { error: "Failed to list tournaments" },
      { status: 500 },
    );
  }
}
