// POST /api/admin/season-competitions/[seasonCompetitionId]/fixtures/generate
// Round-robin fixture stub generation (E1).

import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";
import clientPromise from "@/lib/mongodb";
import {
  requireAnyPermission,
  requireResourceAccess,
} from "@/lib/auth/middleware";
import { generateRoundRobin } from "@/lib/competitions/roundRobin";
import { logPlatformAudit } from "@/lib/audit/platformAuditLog";
import { invalidateStandingsBundleCache } from "@/lib/competitions/standingsReadCache";

const BodySchema = z.object({
  teamIds: z.array(z.string().min(1)).min(2),
  doubleRound: z.boolean().optional(),
  replace: z.boolean().optional(),
});

type Params = { params: Promise<{ seasonCompetitionId: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const { user, response } = await requireAnyPermission(request, [
    "competitions.manage",
    "competitions.fixtures",
  ]);
  if (response) return response;

  try {
    const { seasonCompetitionId } = await params;
    const body = BodySchema.parse(await request.json());

    const client = await clientPromise;
    const db = client.db("hockey-app");

    const sc = await db.collection("season_competitions").findOne({
      seasonCompetitionId,
    });
    if (!sc) {
      return NextResponse.json(
        { error: "Season competition not found" },
        { status: 404 },
      );
    }

    const scope = await requireResourceAccess(
      request,
      "association",
      sc.owningAssociationId as string,
    );
    if (scope.response) return scope.response;

    const pairs = generateRoundRobin(body.teamIds, {
      doubleRound: body.doubleRound,
    });

    if (body.replace) {
      await db.collection("league_fixtures").deleteMany({ seasonCompetitionId });
    }

    const now = new Date().toISOString();
    const docs = pairs.map((p, i) => ({
      fixtureId: `fx-${seasonCompetitionId}-${p.round}-${i}-${Date.now()}`,
      seasonCompetitionId,
      competitionId: sc.competitionId,
      owningAssociationId: sc.owningAssociationId,
      round: p.round,
      homeTeamId: p.homeTeamId,
      awayTeamId: p.awayTeamId,
      status: "scheduled" as const,
      venueId: null,
      venueName: null,
      addressLine: null,
      scheduledStart: null,
      scheduledEnd: null,
      timezone: null,
      published: false,
      publishedAt: null,
      result: null,
      resultStatus: null,
      resultSubmittedAt: null,
      resultSubmittedBy: null,
      resultApprovedAt: null,
      resultApprovedBy: null,
      legacyMatchId: null,
      umpires: null,
      matchLevel: "league",
      createdAt: now,
      createdBy: user.userId,
    }));

    if (docs.length) await db.collection("league_fixtures").insertMany(docs);

    invalidateStandingsBundleCache(seasonCompetitionId);

    await logPlatformAudit({
      userId: user.userId,
      userEmail: user.email,
      category: "fixture",
      action: "generate_round_robin",
      resourceType: "season_competition",
      resourceId: seasonCompetitionId,
      summary: `Generated ${docs.length} fixtures (double=${Boolean(body.doubleRound)})`,
      metadata: { teamCount: body.teamIds.length, replace: Boolean(body.replace) },
    });

    return NextResponse.json({
      seasonCompetitionId,
      count: docs.length,
      fixtures: docs,
    });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.flatten() },
        { status: 400 },
      );
    }
    console.error("POST fixtures/generate error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
