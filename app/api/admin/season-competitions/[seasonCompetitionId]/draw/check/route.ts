// GET /api/admin/season-competitions/[id]/draw/check
// Clashes in the fixtures already saved: pitches, teams, umpires, travel and own-club umpiring.

import { areaGuard } from "@/lib/access/enforce";
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { requireAnyPermission, requireResourceAccess } from "@/lib/auth/middleware";
import { checkCompetition } from "@/lib/draw/service";

type Params = { params: Promise<{ seasonCompetitionId: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const denied = await areaGuard("fixtures", "GET");
  if (denied) return denied;
  const { response } = await requireAnyPermission(request, ["competitions.manage", "competitions.fixtures"]);
  if (response) return response;
  try {
    const { seasonCompetitionId } = await params;
    const db = (await clientPromise).db(process.env.DB_NAME || "hockey-app");
    const sc = await db.collection("season_competitions").findOne({ seasonCompetitionId });
    if (!sc) return NextResponse.json({ error: "Season competition not found" }, { status: 404 });
    const scope = await requireResourceAccess(request, "association", String(sc.owningAssociationId ?? ""));
    if (scope.response) return scope.response;
    return NextResponse.json(await checkCompetition(db, seasonCompetitionId));
  } catch (e) {
    console.error("draw check error:", e);
    return NextResponse.json({ error: "Could not check the draw" }, { status: 500 });
  }
}
