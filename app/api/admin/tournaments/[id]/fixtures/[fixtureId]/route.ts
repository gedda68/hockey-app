// GET   — single rep tournament fixture
// PATCH — schedule / publish (D4)

import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { ZodError } from "zod";
import clientPromise from "@/lib/mongodb";
import { requirePermission } from "@/lib/auth/middleware";
import { logPlatformAudit } from "@/lib/audit/platformAuditLog";
import {
  requireRepTournamentResourceAccess,
  type RepTournamentHostDoc,
} from "@/lib/auth/repTournamentScope";
import { PatchRepTournamentFixtureBodySchema } from "@/lib/db/schemas/repTournamentFixture.schema";

function buildFilter(id: string) {
  return ObjectId.isValid(id)
    ? { _id: new ObjectId(id) }
    : { tournamentId: id };
}

function serialize(doc: Record<string, unknown>) {
  return { ...doc, _id: (doc._id as { toString: () => string } | undefined)?.toString?.() };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; fixtureId: string }> },
) {
  const { response } = await requirePermission(request, "selection.manage");
  if (response) return response;
  try {
    const { id, fixtureId } = await params;
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
    return NextResponse.json(serialize(fixture as Record<string, unknown>));
  } catch (error: unknown) {
    console.error("GET rep tournament fixture error:", error);
    return NextResponse.json({ error: "Failed to load fixture" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; fixtureId: string }> },
) {
  const { user, response } = await requirePermission(request, "selection.manage");
  if (response) return response;
  try {
    const { id, fixtureId } = await params;
    const body = PatchRepTournamentFixtureBodySchema.parse(await request.json());

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

    const $set: Record<string, unknown> = { ...body };

    async function applyEntrySide(
      entryIdField: "homeEntryId" | "awayEntryId",
      teamIdField: "homeTeamId" | "awayTeamId",
      teamNameField: "homeTeamName" | "awayTeamName",
    ) {
      if (!(entryIdField in body)) return;
      const raw = body[entryIdField];
      if (raw === null) {
        $set[teamIdField] = null;
        $set[teamNameField] = null;
        return;
      }
      const entry = await db.collection("team_tournament_entries").findOne({
        tournamentId,
        entryId: raw,
        status: { $nin: ["withdrawn"] },
      });
      if (!entry) {
        throw new Error(`INVALID_ENTRY:${raw}`);
      }
      $set[entryIdField] = raw;
      $set[teamIdField] = entry.teamId ?? null;
      $set[teamNameField] = entry.teamName ?? null;
    }

    try {
      await applyEntrySide("homeEntryId", "homeTeamId", "homeTeamName");
      await applyEntrySide("awayEntryId", "awayTeamId", "awayTeamName");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.startsWith("INVALID_ENTRY:")) {
        const badId = msg.slice("INVALID_ENTRY:".length);
        return NextResponse.json(
          { error: `Unknown or withdrawn entry id: ${badId}` },
          { status: 400 },
        );
      }
      throw e;
    }

    const nowIso = new Date().toISOString();
    Object.assign($set, {
      updatedAt: nowIso,
      updatedBy: user.userId,
    });
    if (body.published === true && !fixture.publishedAt) {
      $set.publishedAt = nowIso;
    }
    if (body.published === false) {
      $set.publishedAt = null;
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
      category: "tournament",
      action: "rep_fixture_patch",
      resourceType: "rep_tournament_fixture",
      resourceId: fixtureId,
      summary: `Updated rep fixture ${fixtureId}`,
      before: {
        published: fixture.published,
        scheduledStart: fixture.scheduledStart,
      },
      after: {
        published: updated?.published,
        scheduledStart: updated?.scheduledStart,
      },
      metadata: { tournamentId },
    });

    return NextResponse.json(serialize(updated as Record<string, unknown>));
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.flatten() },
        { status: 400 },
      );
    }
    console.error("PATCH rep tournament fixture error:", error);
    return NextResponse.json({ error: "Failed to update fixture" }, { status: 500 });
  }
}
