// PATCH / DELETE — single tournament award.

import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { ZodError } from "zod";
import clientPromise from "@/lib/mongodb";
import { requirePermission } from "@/lib/auth/middleware";
import { PatchCompetitionAwardBodySchema } from "@/lib/db/schemas/competitionAwards.schema";
import {
  fetchMemberDisplayName,
  resolveTeamName,
  ensureCompetitionAwardIndexes,
  COMPETITION_AWARDS_COLLECTION,
  serializeAwardForClient,
  validateTournamentAwardMember,
} from "@/lib/competitions/competitionAwards";
import {
  requireRepTournamentResourceAccess,
  type RepTournamentHostDoc,
} from "@/lib/auth/repTournamentScope";
import { logPlatformAudit } from "@/lib/audit/platformAuditLog";
import type { CompetitionAwardType } from "@/lib/db/schemas/competitionAwards.schema";

function buildFilter(id: string) {
  return ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { tournamentId: id };
}

type Params = { params: Promise<{ id: string; awardRecordId: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const { user, response } = await requirePermission(request, "selection.manage");
  if (response) return response;

  try {
    const { id, awardRecordId } = await params;
    const body = PatchCompetitionAwardBodySchema.parse(await request.json());

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

    const existing = await db.collection(COMPETITION_AWARDS_COLLECTION).findOne({
      awardRecordId,
      context: "tournament",
      tournamentId,
    });
    if (!existing) {
      return NextResponse.json({ error: "Award not found" }, { status: 404 });
    }

    const awardType = existing.awardType as CompetitionAwardType;
    const memberId = body.memberId ?? String(existing.memberId ?? "");
    const teamId =
      body.teamId !== undefined
        ? body.teamId === null
          ? null
          : String(body.teamId).trim()
        : (existing.teamId as string | null) ?? null;

    if (awardType === "player_of_match") {
      const fixtureId = String(existing.fixtureId ?? "");
      const fx = await db.collection("rep_tournament_fixtures").findOne({ tournamentId, fixtureId });
      if (!fx) {
        return NextResponse.json({ error: "Fixture not found" }, { status: 404 });
      }
      const homeTeamId = fx.homeTeamId != null ? String(fx.homeTeamId) : null;
      const awayTeamId = fx.awayTeamId != null ? String(fx.awayTeamId) : null;
      const tid = teamId ?? "";
      if (!tid) {
        return NextResponse.json(
          { error: "teamId is required for player of the match" },
          { status: 400 },
        );
      }
      const v = await validateTournamentAwardMember(
        db,
        tournamentId,
        awardType,
        fixtureId,
        memberId,
        tid,
        homeTeamId,
        awayTeamId,
      );
      if (!v.ok) {
        return NextResponse.json({ error: v.error }, { status: v.status });
      }
    } else {
      const v = await validateTournamentAwardMember(
        db,
        tournamentId,
        awardType,
        null,
        memberId,
        teamId,
        null,
        null,
      );
      if (!v.ok) {
        return NextResponse.json({ error: v.error }, { status: v.status });
      }
    }

    const memberDisplayName =
      body.memberId !== undefined
        ? await fetchMemberDisplayName(db, memberId)
        : String(existing.memberDisplayName ?? memberId);
    const teamName =
      body.teamId !== undefined ? await resolveTeamName(db, teamId) : (existing.teamName as string | null);

    const update: Record<string, unknown> = {
      updatedAt: new Date(),
      updatedBy: user.userId,
    };
    if (body.memberId !== undefined) {
      update.memberId = memberId;
      update.memberDisplayName = memberDisplayName;
    }
    if (body.teamId !== undefined) {
      update.teamId = teamId;
      update.teamName = teamName;
    }
    if (body.notes !== undefined) update.notes = body.notes;
    if (body.awardLabelSnapshot !== undefined) {
      update.awardLabelSnapshot = body.awardLabelSnapshot.trim();
    }

    await db.collection(COMPETITION_AWARDS_COLLECTION).updateOne(
      { awardRecordId, context: "tournament", tournamentId },
      { $set: update },
    );

    const updated = await db.collection(COMPETITION_AWARDS_COLLECTION).findOne({
      awardRecordId,
    });

    await logPlatformAudit({
      userId: user.userId,
      userEmail: user.email,
      category: "competition_awards",
      action: "patch",
      resourceType: "tournament_award",
      resourceId: awardRecordId,
      summary: "Updated tournament award",
      metadata: { tournamentId },
    });

    return NextResponse.json(serializeAwardForClient(updated as never));
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.flatten() },
        { status: 400 },
      );
    }
    console.error("PATCH admin tournament award error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const { user, response } = await requirePermission(request, "selection.manage");
  if (response) return response;

  try {
    const { id, awardRecordId } = await params;
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

    const res = await db.collection(COMPETITION_AWARDS_COLLECTION).deleteOne({
      awardRecordId,
      context: "tournament",
      tournamentId,
    });
    if (res.deletedCount === 0) {
      return NextResponse.json({ error: "Award not found" }, { status: 404 });
    }

    await logPlatformAudit({
      userId: user.userId,
      userEmail: user.email,
      category: "competition_awards",
      action: "delete",
      resourceType: "tournament_award",
      resourceId: awardRecordId,
      summary: "Deleted tournament award",
      metadata: { tournamentId },
    });

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    console.error("DELETE admin tournament award error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
