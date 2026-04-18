// GET / POST — awards for a representative tournament.

import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { ZodError } from "zod";
import clientPromise from "@/lib/mongodb";
import { requirePermission } from "@/lib/auth/middleware";
import { CreateCompetitionAwardBodySchema } from "@/lib/db/schemas/competitionAwards.schema";
import {
  mergeAwardsLabels,
  labelForAwardType,
  DEFAULT_AWARDS_LABELS,
  fetchMemberDisplayName,
  insertCompetitionAward,
  upsertPlayerOfMatchAward,
  serializeAwardForClient,
  validateTournamentAwardMember,
  resolveTeamName,
  ensureCompetitionAwardIndexes,
  COMPETITION_AWARDS_COLLECTION,
} from "@/lib/competitions/competitionAwards";
import {
  requireRepTournamentResourceAccess,
  type RepTournamentHostDoc,
} from "@/lib/auth/repTournamentScope";
import { logPlatformAudit } from "@/lib/audit/platformAuditLog";

function buildFilter(id: string) {
  return ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { tournamentId: id };
}

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const { response } = await requirePermission(request, "selection.manage");
  if (response) return response;

  try {
    const { id } = await params;
    const client = await clientPromise;
    const db = client.db("hockey-app");
    await ensureCompetitionAwardIndexes(db);

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
    const raw = (tournament as { awardsLabels?: unknown }).awardsLabels;
    const labels = mergeAwardsLabels(
      typeof raw === "object" && raw !== null ? (raw as Record<string, string>) : {},
      DEFAULT_AWARDS_LABELS,
    );

    const rows = await db
      .collection(COMPETITION_AWARDS_COLLECTION)
      .find({ context: "tournament", tournamentId })
      .sort({ createdAt: -1 })
      .limit(500)
      .toArray();

    return NextResponse.json({
      tournamentId,
      awardsLabels: labels,
      awards: rows.map((r) => serializeAwardForClient(r as never)),
    });
  } catch (error: unknown) {
    console.error("GET admin tournament awards error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  const { user, response } = await requirePermission(request, "selection.manage");
  if (response) return response;

  try {
    const { id } = await params;
    const body = CreateCompetitionAwardBodySchema.parse(await request.json());

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
    const rawLabels = (tournament as { awardsLabels?: unknown }).awardsLabels;
    const labels = mergeAwardsLabels(
      typeof rawLabels === "object" && rawLabels !== null
        ? (rawLabels as Record<string, string>)
        : {},
      DEFAULT_AWARDS_LABELS,
    );
    const snapshot = labelForAwardType(body.awardType, labels);

    const memberDisplayName = await fetchMemberDisplayName(db, body.memberId);
    const teamId = body.teamId != null ? String(body.teamId).trim() : null;

    if (body.awardType === "player_of_match") {
      const fixtureId = String(body.fixtureId ?? "");
      const fx = await db.collection("rep_tournament_fixtures").findOne({ tournamentId, fixtureId });
      if (!fx) {
        return NextResponse.json({ error: "Fixture not found" }, { status: 404 });
      }
      const homeTeamId = fx.homeTeamId != null ? String(fx.homeTeamId) : null;
      const awayTeamId = fx.awayTeamId != null ? String(fx.awayTeamId) : null;
      const v = await validateTournamentAwardMember(
        db,
        tournamentId,
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
        context: "tournament",
        seasonCompetitionId: null,
        tournamentId,
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
        resourceType: "tournament_award",
        resourceId: doc.awardRecordId,
        summary: `Tournament player of the match (${fixtureId})`,
        metadata: { tournamentId, fixtureId },
      });

      return NextResponse.json(serializeAwardForClient(doc));
    }

    const v = await validateTournamentAwardMember(
      db,
      tournamentId,
      body.awardType,
      null,
      body.memberId,
      teamId,
      null,
      null,
    );
    if (!v.ok) {
      return NextResponse.json({ error: v.error }, { status: v.status });
    }

    const teamName = await resolveTeamName(db, teamId);
    const doc = await insertCompetitionAward(db, {
      context: "tournament",
      seasonCompetitionId: null,
      tournamentId,
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
      resourceType: "tournament_award",
      resourceId: doc.awardRecordId,
      summary: `${snapshot} (${body.awardType})`,
      metadata: { tournamentId, awardType: body.awardType },
    });

    return NextResponse.json(serializeAwardForClient(doc));
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.flatten() },
        { status: 400 },
      );
    }
    console.error("POST admin tournament awards error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
