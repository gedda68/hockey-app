// GET / POST — list or create awards for a season competition (league).

import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import clientPromise from "@/lib/mongodb";
import {
  requireAnyPermission,
  requireResourceAccess,
} from "@/lib/auth/middleware";
import { CreateCompetitionAwardBodySchema } from "@/lib/db/schemas/competitionAwards.schema";
import {
  mergeAwardsLabels,
  labelForAwardType,
  DEFAULT_AWARDS_LABELS_LEAGUE,
  fetchMemberDisplayName,
  insertCompetitionAward,
  upsertPlayerOfMatchAward,
  serializeAwardForClient,
  validateLeagueAwardMember,
  resolveTeamName,
  ensureCompetitionAwardIndexes,
  COMPETITION_AWARDS_COLLECTION,
} from "@/lib/competitions/competitionAwards";
import { logPlatformAudit } from "@/lib/audit/platformAuditLog";

type Params = { params: Promise<{ seasonCompetitionId: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const { response } = await requireAnyPermission(request, [
    "competitions.manage",
    "competitions.fixtures",
    "results.manage",
  ]);
  if (response) return response;

  try {
    const { seasonCompetitionId } = await params;
    const client = await clientPromise;
    const db = client.db("hockey-app");
    await ensureCompetitionAwardIndexes(db);

    const sc = await db.collection("season_competitions").findOne({ seasonCompetitionId });
    if (!sc) {
      return NextResponse.json({ error: "Season competition not found" }, { status: 404 });
    }

    const scope = await requireResourceAccess(
      request,
      "association",
      sc.owningAssociationId as string,
    );
    if (scope.response) return scope.response;

    const raw = (sc as { awardsLabels?: unknown }).awardsLabels;
    const labels = mergeAwardsLabels(
      typeof raw === "object" && raw !== null ? (raw as Record<string, string>) : {},
      DEFAULT_AWARDS_LABELS_LEAGUE,
    );

    const rows = await db
      .collection(COMPETITION_AWARDS_COLLECTION)
      .find({ context: "league", seasonCompetitionId })
      .sort({ createdAt: -1 })
      .limit(500)
      .toArray();

    return NextResponse.json({
      seasonCompetitionId,
      awardsLabels: labels,
      awards: rows.map((r) => serializeAwardForClient(r as never)),
    });
  } catch (error: unknown) {
    console.error("GET admin season awards error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  const { user, response } = await requireAnyPermission(request, [
    "competitions.manage",
    "results.manage",
  ]);
  if (response) return response;

  try {
    const { seasonCompetitionId } = await params;
    const body = CreateCompetitionAwardBodySchema.parse(await request.json());

    const client = await clientPromise;
    const db = client.db("hockey-app");

    const sc = await db.collection("season_competitions").findOne({ seasonCompetitionId });
    if (!sc) {
      return NextResponse.json({ error: "Season competition not found" }, { status: 404 });
    }

    const scope = await requireResourceAccess(
      request,
      "association",
      sc.owningAssociationId as string,
    );
    if (scope.response) return scope.response;

    const rawLabels = (sc as { awardsLabels?: unknown }).awardsLabels;
    const labels = mergeAwardsLabels(
      typeof rawLabels === "object" && rawLabels !== null
        ? (rawLabels as Record<string, string>)
        : {},
      DEFAULT_AWARDS_LABELS_LEAGUE,
    );
    const snapshot = labelForAwardType(body.awardType, labels);

    const memberDisplayName = await fetchMemberDisplayName(db, body.memberId);
    const teamId = body.teamId != null ? String(body.teamId).trim() : null;

    if (body.awardType === "player_of_match") {
      const fixtureId = String(body.fixtureId ?? "");
      const fx = await db.collection("league_fixtures").findOne({ seasonCompetitionId, fixtureId });
      if (!fx) {
        return NextResponse.json({ error: "Fixture not found" }, { status: 404 });
      }
      const homeTeamId = String(fx.homeTeamId ?? "");
      const awayTeamId = String(fx.awayTeamId ?? "");
      const v = await validateLeagueAwardMember(
        db,
        seasonCompetitionId,
        body.awardType,
        fixtureId,
        body.memberId,
        teamId,
        homeTeamId,
        awayTeamId,
      );
      if (!v.ok) {
        return NextResponse.json({ error: v.error }, { status: v.status });
      }
      const teamName = await resolveTeamName(db, teamId);
      const doc = await upsertPlayerOfMatchAward(db, {
        context: "league",
        seasonCompetitionId,
        tournamentId: null,
        fixtureId,
        awardType: "player_of_match",
        memberId: body.memberId,
        memberDisplayName,
        teamId,
        teamName,
        awardLabelSnapshot: snapshot,
        notes: body.notes ?? null,
        createdBy: user.userId,
      });

      await logPlatformAudit({
        userId: user.userId,
        userEmail: user.email,
        category: "competition_awards",
        action: "upsert_player_of_match",
        resourceType: "season_competition_award",
        resourceId: doc.awardRecordId,
        summary: `Player of the match for fixture ${fixtureId}`,
        metadata: { seasonCompetitionId, fixtureId },
      });

      return NextResponse.json(serializeAwardForClient(doc));
    }

    const v = await validateLeagueAwardMember(
      db,
      seasonCompetitionId,
      body.awardType,
      null,
      body.memberId,
      teamId,
      "",
      "",
    );
    if (!v.ok) {
      return NextResponse.json({ error: v.error }, { status: v.status });
    }

    const teamName = await resolveTeamName(db, teamId);
    const doc = await insertCompetitionAward(db, {
      context: "league",
      seasonCompetitionId,
      tournamentId: null,
      awardType: body.awardType,
      fixtureId: null,
      memberId: body.memberId,
      memberDisplayName,
      teamId,
      teamName,
      awardLabelSnapshot: snapshot,
      notes: body.notes ?? null,
      createdBy: user.userId,
    });

    await logPlatformAudit({
      userId: user.userId,
      userEmail: user.email,
      category: "competition_awards",
      action: "create",
      resourceType: "season_competition_award",
      resourceId: doc.awardRecordId,
      summary: `${snapshot} (${body.awardType})`,
      metadata: { seasonCompetitionId, awardType: body.awardType },
    });

    return NextResponse.json(serializeAwardForClient(doc));
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.flatten() },
        { status: 400 },
      );
    }
    console.error("POST admin season awards error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
