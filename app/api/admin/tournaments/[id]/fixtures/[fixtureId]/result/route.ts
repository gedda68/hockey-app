// PATCH — rep tournament fixture result (D4; mirrors league result shape, auto-approve for host).

import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { ZodError } from "zod";
import { z } from "zod";
import clientPromise from "@/lib/mongodb";
import { requirePermission } from "@/lib/auth/middleware";
import { logPlatformAudit } from "@/lib/audit/platformAuditLog";
import {
  requireRepTournamentResourceAccess,
  type RepTournamentHostDoc,
} from "@/lib/auth/repTournamentScope";
import {
  FixtureResultStatusSchema,
  FixtureResultTypeSchema,
} from "@/lib/db/schemas/leagueFixture.schema";
import {
  evaluateResultCorrectionPolicy,
  mergeResultPatch,
  normalizeResultForCompare,
  parsePriorResult,
} from "@/lib/competitions/resultCorrection";

function buildFilter(id: string) {
  return ObjectId.isValid(id)
    ? { _id: new ObjectId(id) }
    : { tournamentId: id };
}

function serialize(doc: Record<string, unknown>) {
  return { ...doc, _id: (doc._id as { toString: () => string } | undefined)?.toString?.() };
}

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
    status: FixtureResultStatusSchema.optional(),
    setMatchStatusCompleted: z.boolean().optional(),
    correctionReason: z.string().max(2000).optional(),
    replayOfFixtureId: z.string().min(1).nullable().optional(),
  })
  .strict();

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; fixtureId: string }> },
) {
  const { user, response } = await requirePermission(request, "selection.manage");
  if (response) return response;
  try {
    const { id, fixtureId } = await params;
    const body = BodySchema.parse(await request.json());

    const client = await clientPromise;
    const db = client.db("hockey-app");
    const tournament = await db.collection("rep_tournaments").findOne(buildFilter(id));
    if (!tournament) {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    }
    const scope = await requireRepTournamentResourceAccess(
      request,
      tournament as RepTournamentHostDoc,
    );
    if (scope.response) return scope.response;

    const tournamentId = String(tournament.tournamentId ?? id);
    const fixture = await db.collection("rep_tournament_fixtures").findOne({
      tournamentId,
      fixtureId,
    });
    if (!fixture) {
      return NextResponse.json({ error: "Fixture not found" }, { status: 404 });
    }

    const perms = user.permissions as string[];
    const hasApprovePermission =
      perms.includes("results.approve") || perms.includes("selection.manage");

    const nextStatus = body.status ?? "approved";
    const mergedResult = mergeResultPatch(
      fixture.result as Record<string, unknown> | null | undefined,
      body.result,
    );

    const correctionCheck = evaluateResultCorrectionPolicy({
      priorStatus: fixture.resultStatus as string | undefined,
      priorResultRaw: fixture.result,
      mergedResult,
      nextStatus,
      correctionReason: body.correctionReason,
      hasApprovePermission,
    });
    if (!correctionCheck.ok) {
      return NextResponse.json(
        { error: correctionCheck.error },
        { status: correctionCheck.status },
      );
    }

    const prior = parsePriorResult(fixture.result);
    const priorNorm = prior ? normalizeResultForCompare(prior) : null;
    const mergedNorm = normalizeResultForCompare(mergedResult);
    const resultBodyChanged = priorNorm !== mergedNorm;
    const priorStatusStr = (fixture.resultStatus as string | undefined) ?? null;
    const statusChanged = priorStatusStr !== nextStatus;
    const isCorrection = resultBodyChanged || statusChanged;

    const nowIso = new Date().toISOString();
    const $set: Record<string, unknown> = {
      result: mergedResult,
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
      if (body.setMatchStatusCompleted !== false) {
        $set.status = "completed";
      }
    }

    if (nextStatus === "rejected") {
      $set.resultApprovedAt = null;
      $set.resultApprovedBy = null;
    }

    await db.collection("rep_tournament_fixtures").updateOne(
      { tournamentId, fixtureId },
      { $set },
    );

    const updated = await db.collection("rep_tournament_fixtures").findOne({
      tournamentId,
      fixtureId,
    });

    await logPlatformAudit({
      userId: user.userId,
      userEmail: user.email,
      category: "result",
      action: "rep_fixture_result_patch",
      resourceType: "rep_tournament_fixture",
      resourceId: fixtureId,
      summary: isCorrection
        ? `Rep result correction (${nextStatus})`
        : `Rep result (${nextStatus})`,
      before: {
        result: fixture.result ?? null,
        resultStatus: fixture.resultStatus ?? null,
      },
      after: {
        result: updated?.result ?? null,
        resultStatus: updated?.resultStatus ?? null,
      },
      metadata: {
        tournamentId,
        isCorrection,
        resultBodyChanged,
        statusChanged,
        correctionReason: body.correctionReason?.trim() || undefined,
        replayOfFixtureId: body.replayOfFixtureId ?? undefined,
      },
    });

    return NextResponse.json(serialize(updated as Record<string, unknown>));
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.flatten() },
        { status: 400 },
      );
    }
    console.error("PATCH rep fixture result error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
