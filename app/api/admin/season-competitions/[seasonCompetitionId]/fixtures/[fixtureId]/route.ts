// PATCH /api/admin/season-competitions/[seasonCompetitionId]/fixtures/[fixtureId]
// Update venue, schedule, publish state (E2).

import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import clientPromise from "@/lib/mongodb";
import { requirePermission, requireResourceAccess } from "@/lib/auth/middleware";
import { PatchLeagueFixtureBodySchema } from "@/lib/db/schemas/leagueFixture.schema";
import { logPlatformAudit } from "@/lib/audit/platformAuditLog";

type Params = {
  params: Promise<{ seasonCompetitionId: string; fixtureId: string }>;
};

export async function PATCH(request: NextRequest, { params }: Params) {
  const { user, response } = await requirePermission(
    request,
    "competitions.manage",
  );
  if (response) return response;

  try {
    const { seasonCompetitionId, fixtureId } = await params;
    const body = PatchLeagueFixtureBodySchema.parse(await request.json());

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

    const existing = await db.collection("league_fixtures").findOne({
      fixtureId,
      seasonCompetitionId,
    });
    if (!existing) {
      return NextResponse.json({ error: "Fixture not found" }, { status: 404 });
    }

    const nowIso = new Date().toISOString();
    const $set: Record<string, unknown> = {
      updatedAt: nowIso,
      updatedBy: user.userId,
    };

    const keys = [
      "venueId",
      "venueName",
      "addressLine",
      "scheduledStart",
      "scheduledEnd",
      "timezone",
      "status",
      "legacyMatchId",
      "umpires",
      "matchLevel",
    ] as const;
    for (const k of keys) {
      if (body[k] !== undefined) $set[k] = body[k];
    }

    if (body.published !== undefined) {
      $set.published = body.published;
      $set.publishedAt = body.published ? nowIso : null;
    }

    await db.collection("league_fixtures").updateOne({ fixtureId }, { $set });

    const updated = await db.collection("league_fixtures").findOne({
      fixtureId,
    });

    await logPlatformAudit({
      userId: user.userId,
      userEmail: user.email,
      category: "fixture",
      action: "patch",
      resourceType: "fixture",
      resourceId: fixtureId,
      summary: `Updated fixture (seasonCompetition=${seasonCompetitionId})`,
      before: {
        venueName: existing.venueName,
        scheduledStart: existing.scheduledStart,
        published: existing.published,
        status: existing.status,
      },
      after: {
        venueName: updated?.venueName,
        scheduledStart: updated?.scheduledStart,
        published: updated?.published,
        status: updated?.status,
      },
      metadata: { seasonCompetitionId, owningAssociationId: sc.owningAssociationId },
    });

    return NextResponse.json({
      ...updated,
      _id: updated?._id?.toString?.(),
    });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.flatten() },
        { status: 400 },
      );
    }
    console.error("PATCH admin fixture error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
