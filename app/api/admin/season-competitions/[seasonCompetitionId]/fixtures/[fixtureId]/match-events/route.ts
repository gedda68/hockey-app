// PATCH .../fixtures/[fixtureId]/match-events
// Replace fixture.matchEvents (player-level events, E6).

import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { v4 as uuidv4 } from "uuid";
import clientPromise from "@/lib/mongodb";
import {
  requirePermission,
  requireResourceAccess,
} from "@/lib/auth/middleware";
import { PatchMatchEventsBodySchema } from "@/lib/db/schemas/leagueFixture.schema";
import { logPlatformAudit } from "@/lib/audit/platformAuditLog";

type Params = {
  params: Promise<{ seasonCompetitionId: string; fixtureId: string }>;
};

export async function PATCH(request: NextRequest, { params }: Params) {
  const { user, response } = await requirePermission(request, "results.manage");
  if (response) return response;

  try {
    const { seasonCompetitionId, fixtureId } = await params;
    const body = PatchMatchEventsBodySchema.parse(await request.json());

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

    const home = String(fixture.homeTeamId ?? "");
    const away = String(fixture.awayTeamId ?? "");

    const normalized = body.events.map((e) => ({
      ...e,
      eventId: e.eventId?.trim() || uuidv4(),
    }));

    for (const e of normalized) {
      if (e.teamId !== home && e.teamId !== away) {
        return NextResponse.json(
          { error: `Event teamId must be home or away team (${home} / ${away})` },
          { status: 400 },
        );
      }
      if (e.kind === "goal" && e.assistMemberId && e.assistMemberId === e.memberId) {
        return NextResponse.json(
          { error: "assistMemberId cannot match scorer memberId" },
          { status: 400 },
        );
      }
    }

    const nowIso = new Date().toISOString();
    await db.collection("league_fixtures").updateOne(
      { fixtureId, seasonCompetitionId },
      {
        $set: {
          matchEvents: normalized,
          updatedAt: nowIso,
          updatedBy: user.userId,
        },
      },
    );

    const updated = await db.collection("league_fixtures").findOne({
      fixtureId,
      seasonCompetitionId,
    });

    await logPlatformAudit({
      userId: user.userId,
      userEmail: user.email,
      category: "fixture",
      action: "match_events_replace",
      resourceType: "fixture",
      resourceId: fixtureId,
      summary: `Set matchEvents (${normalized.length} events)`,
      before: { matchEvents: fixture.matchEvents ?? null },
      after: { matchEvents: updated?.matchEvents ?? null },
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
    console.error("PATCH match-events error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
