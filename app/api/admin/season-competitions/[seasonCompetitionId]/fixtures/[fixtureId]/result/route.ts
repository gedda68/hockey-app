// PATCH /api/admin/season-competitions/[seasonCompetitionId]/fixtures/[fixtureId]/result
// Result entry + (optional) approval workflow (E3).

import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";
import clientPromise from "@/lib/mongodb";
import { requirePermission, requireResourceAccess } from "@/lib/auth/middleware";
import {
  FixtureResultStatusSchema,
  FixtureResultTypeSchema,
} from "@/lib/db/schemas/leagueFixture.schema";
import { logPlatformAudit } from "@/lib/audit/platformAuditLog";

type Params = {
  params: Promise<{ seasonCompetitionId: string; fixtureId: string }>;
};

const BodySchema = z
  .object({
    result: z.object({
      resultType: FixtureResultTypeSchema.optional(),
      homeScore: z.number().int().min(0).nullable().optional(),
      awayScore: z.number().int().min(0).nullable().optional(),
      shootoutHomeScore: z.number().int().min(0).nullable().optional(),
      shootoutAwayScore: z.number().int().min(0).nullable().optional(),
      forfeitingTeamId: z.string().min(1).nullable().optional(),
      notes: z.string().nullable().optional(),
    }),
    status: FixtureResultStatusSchema.optional(), // draft|submitted|approved|rejected
    setMatchStatusCompleted: z.boolean().optional(),
  })
  .strict();

export async function PATCH(request: NextRequest, { params }: Params) {
  const { user, response } = await requirePermission(request, "results.manage");
  if (response) return response;

  try {
    const { seasonCompetitionId, fixtureId } = await params;
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

    const fixture = await db.collection("league_fixtures").findOne({
      seasonCompetitionId,
      fixtureId,
    });
    if (!fixture) {
      return NextResponse.json({ error: "Fixture not found" }, { status: 404 });
    }

    const requiresApproval = Boolean(sc.resultApprovalRequired);
    const nextStatus = body.status ?? "submitted";

    if (nextStatus === "approved" && requiresApproval) {
      if (!(user.permissions as string[]).includes("results.approve")) {
        return NextResponse.json(
          { error: "Forbidden - Result approval required" },
          { status: 403 },
        );
      }
    }

    const nowIso = new Date().toISOString();
    const $set: Record<string, unknown> = {
      result: {
        resultType: body.result.resultType ?? "normal",
        homeScore: body.result.homeScore ?? null,
        awayScore: body.result.awayScore ?? null,
        shootoutHomeScore: body.result.shootoutHomeScore ?? null,
        shootoutAwayScore: body.result.shootoutAwayScore ?? null,
        forfeitingTeamId: body.result.forfeitingTeamId ?? null,
        notes: body.result.notes ?? null,
      },
      resultStatus: nextStatus,
      updatedAt: nowIso,
      updatedBy: user.userId,
    };

    if (nextStatus === "submitted") {
      $set.resultSubmittedAt = nowIso;
      $set.resultSubmittedBy = user.userId;
    }

    if (nextStatus === "approved") {
      $set.resultApprovedAt = nowIso;
      $set.resultApprovedBy = user.userId;
      if (body.setMatchStatusCompleted) $set.status = "completed";
    }

    if (nextStatus === "rejected") {
      $set.resultApprovedAt = null;
      $set.resultApprovedBy = null;
    }

    await db
      .collection("league_fixtures")
      .updateOne({ fixtureId, seasonCompetitionId }, { $set });

    const updated = await db.collection("league_fixtures").findOne({
      fixtureId,
      seasonCompetitionId,
    });

    await logPlatformAudit({
      userId: user.userId,
      userEmail: user.email,
      category: "result",
      action: "patch",
      resourceType: "fixture",
      resourceId: fixtureId,
      summary: `Updated result (${nextStatus})`,
      before: {
        result: fixture.result ?? null,
        resultStatus: fixture.resultStatus ?? null,
      },
      after: {
        result: updated?.result ?? null,
        resultStatus: updated?.resultStatus ?? null,
      },
      metadata: {
        seasonCompetitionId,
        owningAssociationId: sc.owningAssociationId,
        requiresApproval,
      },
    });

    return NextResponse.json({ ...updated, _id: updated?._id?.toString?.() });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.flatten() },
        { status: 400 },
      );
    }
    console.error("PATCH fixture result error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

