// POST /api/admin/season-competitions/[seasonCompetitionId]/fixtures/publish
// Body: { published: boolean, round?: number }. Publishes or unpublishes every match of the competition (or one round).

import { areaGuard } from "@/lib/access/enforce";
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { requireAnyPermission, requireResourceAccess } from "@/lib/auth/middleware";
import { setFixturesPublished } from "@/lib/competitions/publishing";
import { logPlatformAudit } from "@/lib/audit/platformAuditLog";

type Params = { params: Promise<{ seasonCompetitionId: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const areaDenied = await areaGuard("fixtures", "POST");
  if (areaDenied) return areaDenied;

  const { user, response } = await requireAnyPermission(request, ["competitions.manage", "competitions.fixtures"]);
  if (response) return response;
  try {
    const { seasonCompetitionId } = await params;
    const body = (await request.json().catch(() => ({}))) as { published?: unknown; round?: unknown };
    if (typeof body.published !== "boolean") return NextResponse.json({ error: "published must be true or false" }, { status: 400 });
    const round = body.round === undefined || body.round === null ? null : Number(body.round);
    if (round !== null && !Number.isInteger(round)) return NextResponse.json({ error: "round must be a whole number" }, { status: 400 });

    const db = (await clientPromise).db(process.env.DB_NAME || "hockey-app");
    const sc = await db.collection("season_competitions").findOne({ seasonCompetitionId });
    if (!sc) return NextResponse.json({ error: "Season competition not found" }, { status: 404 });
    const scope = await requireResourceAccess(request, "association", String(sc.owningAssociationId ?? ""));
    if (scope.response) return scope.response;

    const count = await setFixturesPublished(db, seasonCompetitionId, body.published, round);
    await logPlatformAudit({
      userId: user.userId, userEmail: user.email, category: "fixture", action: body.published ? "publish" : "unpublish", resourceType: "season_competition", resourceId: seasonCompetitionId,
      summary: `${body.published ? "Published" : "Unpublished"} ${count} matches${round !== null ? ` in round ${round}` : ""}`, after: { count, round },
    });
    return NextResponse.json({ ok: true, count });
  } catch (e) {
    console.error("fixtures publish failed:", e);
    return NextResponse.json({ error: "Failed to update matches" }, { status: 500 });
  }
}
