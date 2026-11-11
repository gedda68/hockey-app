// GET /api/public/division-matches?seasonCompetitionId=…
// Compact list of a season competition's published matches (match centre quick links).

import { NextRequest, NextResponse } from "next/server";
import { getDivisionMatchList } from "@/lib/data/divisionMatchList";

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("seasonCompetitionId")?.trim() ?? "";
  if (!id) return NextResponse.json({ error: "seasonCompetitionId required" }, { status: 400 });
  try {
    const matches = await getDivisionMatchList(id);
    return NextResponse.json({ seasonCompetitionId: id, matches }, { headers: { "Cache-Control": "public, max-age=60" } });
  } catch (e) {
    console.error("GET /api/public/division-matches:", e);
    return NextResponse.json({ error: "Failed to load matches" }, { status: 500 });
  }
}
