// POST /api/admin/season-competitions/[seasonCompetitionId]/fixtures/[fixtureId]/control
// Association-admin match control actions that the plain fixture PATCH does not cover:
//   { action: "change_teams", homeTeamId, awayTeamId, reason }
//   { action: "void", reason }   — cancels the match and clears any result
// Both require a written reason and are audited.

import { NextRequest, NextResponse } from "next/server";
import { ZodError, z } from "zod";
import clientPromise from "@/lib/mongodb";
import { requireAnyPermission, requireResourceAccess } from "@/lib/auth/middleware";
import { logPlatformAudit } from "@/lib/audit/platformAuditLog";
import { invalidateStandingsBundleCache } from "@/lib/competitions/standingsReadCache";
import { FIXTURE_LINEUPS_COLLECTION } from "@/lib/db/schemas/fixtureLineup.schema";

type Params = { params: Promise<{ seasonCompetitionId: string; fixtureId: string }> };

const Reason = z.string().trim().min(3, "A reason is required").max(500);
const BodySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("change_teams"),
    homeTeamId: z.string().min(1),
    awayTeamId: z.string().min(1),
    reason: Reason,
  }),
  z.object({ action: z.literal("void"), reason: Reason }),
]);

export async function POST(request: NextRequest, { params }: Params) {
  const { user, response } = await requireAnyPermission(request, [
    "competitions.manage",
    "competitions.fixtures",
    "results.manage",
  ]);
  if (response) return response;

  try {
    const { seasonCompetitionId, fixtureId } = await params;
    const body = BodySchema.parse(await request.json());
    const held = user.permissions as string[];
    const can = (...p: string[]) => p.some((x) => held.includes(x));

    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || "hockey-app");
    const sc = await db.collection("season_competitions").findOne({ seasonCompetitionId });
    if (!sc) return NextResponse.json({ error: "Competition not found" }, { status: 404 });
    const scope = await requireResourceAccess(request, "association", sc.owningAssociationId as string);
    if (scope.response) return scope.response;

    const fixture = await db.collection("league_fixtures").findOne({ fixtureId, seasonCompetitionId });
    if (!fixture) return NextResponse.json({ error: "Fixture not found" }, { status: 404 });

    const nowIso = new Date().toISOString();

    if (body.action === "change_teams") {
      if (!can("competitions.manage", "competitions.fixtures")) {
        return NextResponse.json({ error: "Forbidden - Insufficient permissions" }, { status: 403 });
      }
      if (body.homeTeamId === body.awayTeamId) {
        return NextResponse.json({ error: "Home and away must be different teams" }, { status: 400 });
      }
      if (["in_progress", "completed"].includes(String(fixture.status)) || fixture.resultStatus === "approved") {
        return NextResponse.json(
          { error: "Teams can't be changed once the match has started or its result is approved. Void the match first." },
          { status: 409 },
        );
      }
      const found = await db
        .collection("teams")
        .find({ teamId: { $in: [body.homeTeamId, body.awayTeamId] } })
        .project({ teamId: 1 })
        .toArray();
      if (found.length !== 2) {
        return NextResponse.json({ error: "Unknown team" }, { status: 400 });
      }

      await db.collection("league_fixtures").updateOne(
        { fixtureId, seasonCompetitionId },
        { $set: { homeTeamId: body.homeTeamId, awayTeamId: body.awayTeamId, updatedAt: nowIso, updatedBy: user.userId } },
      );
      // Rosters named for a team that is no longer playing are stale.
      await db.collection(FIXTURE_LINEUPS_COLLECTION).deleteMany({
        fixtureId,
        teamId: { $nin: [body.homeTeamId, body.awayTeamId] },
      });
      invalidateStandingsBundleCache(seasonCompetitionId);
      await logPlatformAudit({
        userId: user.userId, userEmail: user.email, category: "fixture", action: "change_teams",
        resourceType: "fixture", resourceId: fixtureId,
        summary: `Teams changed: ${fixture.homeTeamId} v ${fixture.awayTeamId} → ${body.homeTeamId} v ${body.awayTeamId}`,
        before: { homeTeamId: fixture.homeTeamId, awayTeamId: fixture.awayTeamId },
        after: { homeTeamId: body.homeTeamId, awayTeamId: body.awayTeamId },
        metadata: { reason: body.reason },
      });
      return NextResponse.json({ ok: true });
    }

    // void
    if (!can("competitions.manage", "results.manage")) {
      return NextResponse.json({ error: "Forbidden - Insufficient permissions" }, { status: 403 });
    }
    await db.collection("league_fixtures").updateOne(
      { fixtureId, seasonCompetitionId },
      {
        $set: {
          status: "cancelled", result: null, resultStatus: null,
          resultApprovedAt: null, resultApprovedBy: null, updatedAt: nowIso, updatedBy: user.userId,
        },
      },
    );
    invalidateStandingsBundleCache(seasonCompetitionId);
    await logPlatformAudit({
      userId: user.userId, userEmail: user.email, category: "result", action: "void",
      resourceType: "fixture", resourceId: fixtureId,
      summary: "Match voided: cancelled and result cleared",
      before: { status: fixture.status ?? null, result: fixture.result ?? null, resultStatus: fixture.resultStatus ?? null },
      after: { status: "cancelled", result: null, resultStatus: null },
      metadata: { reason: body.reason },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: e.issues[0]?.message ?? "Invalid request", details: e.issues }, { status: 400 });
    }
    console.error("fixture control failed:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
