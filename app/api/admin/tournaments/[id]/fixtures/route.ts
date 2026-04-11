// GET  — list rep tournament fixtures (D4)
// POST — generate pool round-robin and/or knockout rows from draw (D3)

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
import { RepTournamentFixturesGenerateBodySchema } from "@/lib/db/schemas/repTournamentFixture.schema";
import { mergeDrawState } from "@/lib/tournaments/tournamentDraw";
import {
  collectPoolsFromDraw,
  generateRepPoolRoundRobinFixtures,
  type EntryTeamInfo,
} from "@/lib/tournaments/repTournamentFixtureGenerate";
import {
  collectKnockoutSkeletonMatches,
  generateRepKnockoutFixturesFromDraw,
} from "@/lib/tournaments/repTournamentKnockoutGenerate";

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
  { params }: { params: Promise<{ id: string }> },
) {
  const { response } = await requirePermission(request, "selection.manage");
  if (response) return response;
  try {
    const { id } = await params;
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
    const fixtures = await db
      .collection("rep_tournament_fixtures")
      .find({ tournamentId })
      .sort({ sequence: 1 })
      .toArray();

    return NextResponse.json({
      fixtures: fixtures.map((f) => serialize(f as Record<string, unknown>)),
      tournamentId,
      title: tournament.title,
      resultApprovalRequired: Boolean(tournament.resultApprovalRequired),
      championEntryId: tournament.championEntryId ?? null,
      championTeamName: tournament.championTeamName ?? null,
    });
  } catch (error: unknown) {
    console.error("GET rep tournament fixtures error:", error);
    return NextResponse.json({ error: "Failed to list fixtures" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, response } = await requirePermission(request, "selection.manage");
  if (response) return response;
  try {
    const { id } = await params;
    const body = RepTournamentFixturesGenerateBodySchema.parse(await request.json());
    const mode = body.mode ?? "pool_round_robin";

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
    const draw = mergeDrawState(tournament.draw, {});

    const entries = await db
      .collection("team_tournament_entries")
      .find({
        tournamentId,
        status: { $nin: ["withdrawn"] },
      })
      .project({ entryId: 1, teamId: 1, teamName: 1 })
      .toArray();

    const entryByEntryId = new Map<string, EntryTeamInfo>();
    for (const e of entries) {
      const entryId = String(e.entryId ?? "");
      if (!entryId) continue;
      entryByEntryId.set(entryId, {
        entryId,
        teamId: String(e.teamId ?? ""),
        teamName: String(e.teamName ?? ""),
      });
    }

    const phaseFilter = mode === "pool_round_robin" ? "pool" : "knockout";
    const existingPhaseCount = await db
      .collection("rep_tournament_fixtures")
      .countDocuments({ tournamentId, phase: phaseFilter });

    if (existingPhaseCount > 0 && !body.replace) {
      return NextResponse.json(
        {
          error: `Fixtures already exist for phase "${phaseFilter}". Pass { "replace": true } to delete and regenerate this phase only.`,
        },
        { status: 409 },
      );
    }

    const nowIso = new Date().toISOString();
    let created = 0;

    if (mode === "pool_round_robin") {
      const pools = collectPoolsFromDraw(draw);
      if (!pools.length) {
        return NextResponse.json(
          {
            error:
              "No pools with at least two teams found on the tournament draw. Generate pools on the draw first (D3).",
          },
          { status: 400 },
        );
      }

      const missing: string[] = [];
      for (const p of pools) {
        for (const eid of p.entryIds) {
          if (!entryByEntryId.has(eid)) missing.push(eid);
        }
      }
      if (missing.length) {
        return NextResponse.json(
          {
            error: `Unknown or withdrawn entry id(s): ${[...new Set(missing)].slice(0, 8).join(", ")}${missing.length > 8 ? "…" : ""}`,
          },
          { status: 400 },
        );
      }

      const docs = generateRepPoolRoundRobinFixtures({
        tournamentId,
        draw,
        entryByEntryId,
        doubleRound: body.doubleRound,
        createdBy: user.userId,
        nowIso,
      });

      if (!docs.length) {
        return NextResponse.json(
          { error: "No pairings were generated (check pool entry lists)." },
          { status: 400 },
        );
      }

      if (body.replace) {
        await db.collection("rep_tournament_fixtures").deleteMany({ tournamentId, phase: "pool" });
      }
      await db.collection("rep_tournament_fixtures").insertMany(docs);
      created = docs.length;
    } else {
      const skeleton = collectKnockoutSkeletonMatches(draw);
      if (!skeleton.length) {
        return NextResponse.json(
          {
            error:
              "No knockout skeleton on the draw. Add knockout rows via D3 (e.g. division playoff skeleton or single-table KO).",
          },
          { status: 400 },
        );
      }

      const last = await db
        .collection("rep_tournament_fixtures")
        .find({ tournamentId })
        .sort({ sequence: -1 })
        .limit(1)
        .toArray();
      const sequenceStart =
        last.length && typeof last[0]?.sequence === "number" ? last[0]!.sequence + 1 : 0;

      const docs = generateRepKnockoutFixturesFromDraw({
        tournamentId,
        draw,
        entryByEntryId,
        sequenceStart,
        createdBy: user.userId,
        nowIso,
      });

      if (body.replace) {
        await db
          .collection("rep_tournament_fixtures")
          .deleteMany({ tournamentId, phase: "knockout" });
      }
      await db.collection("rep_tournament_fixtures").insertMany(docs);
      created = docs.length;
    }

    await logPlatformAudit({
      userId: user.userId,
      userEmail: user.email,
      category: "tournament",
      action: "rep_fixtures_generate",
      resourceType: "rep_tournament",
      resourceId: tournamentId,
      summary: `Generated ${created} rep ${phaseFilter} fixture(s)`,
      before: { phase: phaseFilter, replace: Boolean(body.replace) },
      after: { created, mode },
    });

    const fixtures = await db
      .collection("rep_tournament_fixtures")
      .find({ tournamentId })
      .sort({ sequence: 1 })
      .toArray();

    return NextResponse.json({
      created,
      mode,
      fixtures: fixtures.map((f) => serialize(f as Record<string, unknown>)),
    });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.flatten() },
        { status: 400 },
      );
    }
    console.error("POST rep tournament fixtures generate error:", error);
    return NextResponse.json({ error: "Failed to generate fixtures" }, { status: 500 });
  }
}
