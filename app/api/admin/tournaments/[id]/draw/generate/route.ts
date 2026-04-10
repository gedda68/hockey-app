// POST – generate pools / knockout structure from current entries (and optional seeds)

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
import { DrawGenerateBodySchema } from "@/lib/db/schemas/repTournamentDraw.schema";
import {
  generateTournamentDrawState,
  loadEntryIdsForTournament,
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
    const body = DrawGenerateBodySchema.parse(await request.json());

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
    const entryIds = await loadEntryIdsForTournament(db, tournamentId);
    if (entryIds.length < 2) {
      return NextResponse.json(
        { error: "At least two non-withdrawn team entries are required to generate a draw." },
        { status: 400 },
      );
    }

    const prev = mergeDrawState(existing.draw, {});
    const next = generateTournamentDrawState(body, entryIds, {
      seeds: prev.seeds,
      notes: prev.notes,
    });

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
      action: "draw_generate",
      resourceType: "rep_tournament",
      resourceId: tournamentId,
      summary: `Generated tournament draw (${body.kind} → ${next.format})`,
      before: { draw: existing.draw ?? null },
      after: { draw: result.draw ?? null },
    });

    return NextResponse.json({ draw: mergeDrawState(result.draw, {}) });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.flatten() },
        { status: 400 },
      );
    }
    console.error("POST /api/admin/tournaments/[id]/draw/generate error:", error);
    return NextResponse.json({ error: "Failed to generate draw" }, { status: 500 });
  }
}
