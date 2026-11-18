// POST /api/admin/season-competitions/[id]/draw
// Body: draw settings (see cleanDrawInput) + { apply?: boolean, applyUmpires?: boolean }.
// Without apply it returns the proposed draw, clashes and umpire suggestions and saves nothing.
// With apply it rebuilds the plan on the server and saves unpublished fixtures (and umpire allocations if asked).

import { areaGuard } from "@/lib/access/enforce";
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { requireAnyPermission, requireResourceAccess } from "@/lib/auth/middleware";
import { buildPlan, cleanDrawInput, savePlan } from "@/lib/draw/service";
import { logPlatformAudit } from "@/lib/audit/platformAuditLog";
import { invalidateStandingsBundleCache } from "@/lib/competitions/standingsReadCache";
import { isLeagueFixtureBulkReplaceEnabled } from "@/lib/platform/featureFlags";

type Params = { params: Promise<{ seasonCompetitionId: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const denied = await areaGuard("fixtures", "POST");
  if (denied) return denied;
  const { user, response } = await requireAnyPermission(request, ["competitions.manage", "competitions.fixtures"]);
  if (response) return response;
  try {
    const { seasonCompetitionId } = await params;
    const raw = await request.json().catch(() => ({}));
    const input = cleanDrawInput(raw);
    if (!input.ok) return NextResponse.json({ error: input.error }, { status: 400 });

    const db = (await clientPromise).db(process.env.DB_NAME || "hockey-app");
    const sc = await db.collection("season_competitions").findOne({ seasonCompetitionId });
    if (!sc) return NextResponse.json({ error: "Season competition not found" }, { status: 404 });
    const scope = await requireResourceAccess(request, "association", String(sc.owningAssociationId ?? ""));
    if (scope.response) return scope.response;

    const apply = (raw as { apply?: boolean }).apply === true;
    if (apply && input.value.replace && !isLeagueFixtureBulkReplaceEnabled()) return NextResponse.json({ error: "Replacing fixtures in bulk is switched off" }, { status: 403 });

    const built = await buildPlan(db, seasonCompetitionId, input.value);
    if (!built.ok) return NextResponse.json({ error: built.error }, { status: built.status });
    if (!apply) return NextResponse.json({ plan: built.plan });

    if (built.plan.clashes.some((c) => c.severity === "block")) return NextResponse.json({ error: "The draw still has clashes that must be fixed", plan: built.plan }, { status: 409 });
    const saved = await savePlan(db, seasonCompetitionId, built.scope, built.plan, { userId: user.userId, replace: input.value.replace, withUmpires: (raw as { applyUmpires?: boolean }).applyUmpires === true });
    invalidateStandingsBundleCache(seasonCompetitionId);
    await logPlatformAudit({ userId: user.userId, userEmail: user.email, category: "fixture", action: "generate_draw", resourceType: "season_competition", resourceId: seasonCompetitionId, summary: `Generated a scheduled draw: ${saved.fixtures} fixtures, ${saved.umpireAssignments} umpire allocations`, metadata: { teamCount: input.value.teamIds.length, replace: !!input.value.replace } });
    return NextResponse.json({ saved, plan: built.plan });
  } catch (e) {
    console.error("draw error:", e);
    return NextResponse.json({ error: "Could not build the draw" }, { status: 500 });
  }
}
