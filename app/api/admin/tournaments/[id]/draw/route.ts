// GET  – current tournament draw
// PUT  – merge patch into `rep_tournaments.draw` (validated entry IDs)

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
import { PatchTournamentDrawStateSchema } from "@/lib/db/schemas/repTournamentDraw.schema";
import {
  mergeDrawState,
  validateDrawStateReferences,
} from "@/lib/tournaments/tournamentDraw";

function buildFilter(id: string) {
  return ObjectId.isValid(id)
    ? { _id: new ObjectId(id) }
    : { tournamentId: id };
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

    const draw = mergeDrawState(tournament.draw, {});
    return NextResponse.json({ draw });
  } catch (error: unknown) {
    console.error("GET /api/admin/tournaments/[id]/draw error:", error);
    return NextResponse.json({ error: "Failed to load draw" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, response } = await requirePermission(request, "selection.manage");
  if (response) return response;
  try {
    const { id } = await params;
    const patch = PatchTournamentDrawStateSchema.parse(await request.json());

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
    const merged = mergeDrawState(existing.draw, patch);
    const v = await validateDrawStateReferences(db, tournamentId, merged);
    if (!v.ok) {
      return NextResponse.json({ error: v.message }, { status: 400 });
    }

    const now = new Date().toISOString();
    const result = await db
      .collection("rep_tournaments")
      .findOneAndUpdate(buildFilter(id), { $set: { draw: merged, updatedAt: now } }, {
        returnDocument: "after",
      });

    if (!result) {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    }

    await logPlatformAudit({
      userId: user.userId,
      userEmail: user.email,
      category: "tournament",
      action: "draw_update",
      resourceType: "rep_tournament",
      resourceId: tournamentId,
      summary: `Updated tournament draw (${merged.format})`,
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
    console.error("PUT /api/admin/tournaments/[id]/draw error:", error);
    return NextResponse.json({ error: "Failed to update draw" }, { status: 500 });
  }
}
