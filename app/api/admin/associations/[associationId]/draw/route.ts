// POST /api/admin/associations/[associationId]/draw
// Body: { divisions: [{ seasonCompetitionId, teamIds }], startDate, slotTimes, ... , apply?, applyUmpires? }
// Without apply it returns the proposed draw (all divisions together), its clashes and suggested umpires, and saves nothing.
// With apply it rebuilds the plan on the server and saves unpublished fixtures (and umpire allocations if asked).

import { areaGuard } from "@/lib/access/enforce";
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { requireAnyPermission, requireResourceAccess } from "@/lib/auth/middleware";
import { buildPlan, cleanDrawInput, savePlan } from "@/lib/draw/service";
import { logPlatformAudit } from "@/lib/audit/platformAuditLog";
import { invalidateStandingsBundleCache } from "@/lib/competitions/standingsReadCache";
import { isLeagueFixtureBulkReplaceEnabled } from "@/lib/platform/featureFlags";

type Params = { params: Promise<{ associationId: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const denied = await areaGuard("fixtures", "POST");
  if (denied) return denied;
  const { user, response } = await requireAnyPermission(request, ["competitions.manage", "competitions.fixtures"]);
  if (response) return response;
  try {
    const { associationId } = await params;
    const scope = await requireResourceAccess(request, "association", associationId);
    if (scope.response) return scope.response;

    const raw = await request.json().catch(() => ({}));
    const input = cleanDrawInput(raw);
    if (!input.ok) return NextResponse.json({ error: input.error }, { status: 400 });
    const apply = (raw as { apply?: boolean }).apply === true;
    if (apply && input.value.replace && !isLeagueFixtureBulkReplaceEnabled()) return NextResponse.json({ error: "Replacing fixtures in bulk is switched off" }, { status: 403 });

    const db = (await clientPromise).db(process.env.DB_NAME || "hockey-app");
    const built = await buildPlan(db, input.value);
    if (!built.ok) return NextResponse.json({ error: built.error }, { status: built.status });
    // The divisions must belong to the association in the URL the caller was checked against.
    if (built.scope.associationId !== associationId) return NextResponse.json({ error: "Those divisions belong to another association" }, { status: 403 });
    if (!apply) return NextResponse.json({ plan: built.plan });

    if (built.plan.clashes.some((c) => c.severity === "block") || built.plan.unplaced.length) return NextResponse.json({ error: "The draw still has clashes or unplaced matches that must be fixed", plan: built.plan }, { status: 409 });
    const saved = await savePlan(db, built.scope, built.plan, { userId: user.userId, replace: input.value.replace, withUmpires: (raw as { applyUmpires?: boolean }).applyUmpires === true });
    for (const d of input.value.divisions) invalidateStandingsBundleCache(d.seasonCompetitionId);
    await logPlatformAudit({ userId: user.userId, userEmail: user.email, category: "fixture", action: "generate_draw", resourceType: "association", resourceId: associationId, summary: `Generated a scheduled draw: ${saved.fixtures} fixtures across ${saved.competitions} divisions, ${saved.umpireAssignments} umpire allocations`, metadata: { divisions: input.value.divisions.map((d) => d.seasonCompetitionId), replace: !!input.value.replace } });
    return NextResponse.json({ saved, plan: built.plan });
  } catch (e) {
    console.error("draw error:", e);
    return NextResponse.json({ error: "Could not build the draw" }, { status: 500 });
  }
}
