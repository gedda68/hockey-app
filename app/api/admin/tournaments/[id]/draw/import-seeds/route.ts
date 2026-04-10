// POST – set draw seeds from a season competition ladder (by team id)

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
import { DrawImportSeedsBodySchema } from "@/lib/db/schemas/repTournamentDraw.schema";
import {
  importSeedsFromLeagueStandings,
  mergeDrawState,
  validateDrawStateReferences,
} from "@/lib/tournaments/tournamentDraw";

function buildFilter(id: string) {
  return ObjectId.isValid(id)
    ? { _id: new ObjectId(id) }
    : { tournamentId: id };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, response } = await requirePermission(request, "selection.manage");
  if (response) return response;
  try {
    const { id } = await params;
    const body = DrawImportSeedsBodySchema.parse(await request.json());

    const client = await clientPromise;
    const db = client.db("hockey-app");
    const existing = await db.collection("rep_tournaments").findOne(buildFilter(id));
    if (!existing) {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    }
    const scope = await requireRepTournamentResourceAccess(
      request,
      existing as RepTournamentHostDoc,
    );
    if (scope.response) return scope.response;

    const tournamentId = String(existing.tournamentId ?? id);

    let imported: Record<string, number>;
    try {
      imported = await importSeedsFromLeagueStandings(
        db,
        tournamentId,
        body.seasonCompetitionId,
        body.publishedFixturesOnly,
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Import failed";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const prev = mergeDrawState(existing.draw, {});
    const next = mergeDrawState(prev, { seeds: imported });

    const v = await validateDrawStateReferences(db, tournamentId, next);
    if (!v.ok) {
      return NextResponse.json({ error: v.message }, { status: 400 });
    }

    const now = new Date().toISOString();
    const result = await db
      .collection("rep_tournaments")
      .findOneAndUpdate(buildFilter(id), { $set: { draw: next, updatedAt: now } }, {
        returnDocument: "after",
      });

    if (!result) {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    }

    await logPlatformAudit({
      userId: user.userId,
      userEmail: user.email,
      category: "tournament",
      action: "draw_import_seeds",
      resourceType: "rep_tournament",
      resourceId: tournamentId,
      summary: `Imported tournament seeds from standings (${body.seasonCompetitionId})`,
      before: { draw: existing.draw ?? null },
      after: { draw: result.draw ?? null },
    });

    return NextResponse.json({
      draw: mergeDrawState(result.draw, {}),
      seedsImported: Object.keys(imported).length,
    });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.flatten() },
        { status: 400 },
      );
    }
    console.error("POST /api/admin/tournaments/[id]/draw/import-seeds error:", error);
    return NextResponse.json({ error: "Failed to import seeds" }, { status: 500 });
  }
}
