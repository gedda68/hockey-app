// app/api/admin/tournaments/[id]/route.ts
// GET    – single tournament
// PUT    – update tournament (re-calculates nomination period end date if not custom)
// DELETE – remove tournament

import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { requirePermission } from "@/lib/auth/middleware";
import { upsertNominationPeriod } from "../route";
import type { CreateTournamentRequest } from "@/types/tournaments";

function buildFilter(id: string) {
  return ObjectId.isValid(id)
    ? { _id: new ObjectId(id) }
    : { tournamentId: id };
}

// ─── GET /api/admin/tournaments/[id] ─────────────────────────────────────────
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { response } = await requirePermission(_request, "selection.manage");
  if (response) return response;
  try {
    const { id } = await params;
    const client = await clientPromise;
    const db = client.db("hockey-app");

    const tournament = await db.collection("rep_tournaments").findOne(buildFilter(id));
    if (!tournament) {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    }

    return NextResponse.json({ ...tournament, _id: tournament._id.toString() });
  } catch (error: unknown) {
    console.error("GET /api/admin/tournaments/[id] error:", error);
    return NextResponse.json({ error: "Failed to fetch tournament" }, { status: 500 });
  }
}

// ─── PUT /api/admin/tournaments/[id] ─────────────────────────────────────────
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { response } = await requirePermission(request, "selection.manage");
  if (response) return response;
  try {
    const { id } = await params;
    const body: Partial<CreateTournamentRequest> = await request.json();

    const client = await clientPromise;
    const db = client.db("hockey-app");

    const existing = await db.collection("rep_tournaments").findOne(buildFilter(id));
    if (!existing) {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    }

    // Validate dates if both provided
    const newStart = body.startDate ?? existing.startDate;
    const newEnd = body.endDate ?? existing.endDate;
    if (newEnd < newStart) {
      return NextResponse.json(
        { error: "Tournament end date must be on or after start date" },
        { status: 400 },
      );
    }

    const now = new Date().toISOString();
    const updateFields: Record<string, unknown> = {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.gender !== undefined && { gender: body.gender }),
      ...(body.startDate !== undefined && { startDate: body.startDate }),
      ...(body.endDate !== undefined && { endDate: body.endDate }),
      ...(body.location !== undefined && { location: body.location }),
      ...(body.additionalInfo !== undefined && { additionalInfo: body.additionalInfo }),
      ...(body.nominationFee !== undefined && { nominationFee: body.nominationFee }),
      updatedAt: now,
    };

    const result = await db
      .collection("rep_tournaments")
      .findOneAndUpdate(buildFilter(id), { $set: updateFields }, { returnDocument: "after" });

    // Re-sync nomination period end date if the tournament start date changed
    if (body.startDate) {
      await upsertNominationPeriod(db, {
        season: existing.season,
        ageGroup: existing.ageGroup,
        tournamentStartDate: body.startDate,
        tournamentId: existing.tournamentId,
      });
    }

    return NextResponse.json({ ...result, _id: result!._id.toString() });
  } catch (error: unknown) {
    console.error("PUT /api/admin/tournaments/[id] error:", error);
    return NextResponse.json({ error: "Failed to update tournament" }, { status: 500 });
  }
}

// ─── DELETE /api/admin/tournaments/[id] ──────────────────────────────────────
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { response } = await requirePermission(_request, "selection.manage");
  if (response) return response;
  try {
    const { id } = await params;
    const client = await clientPromise;
    const db = client.db("hockey-app");

    const result = await db.collection("rep_tournaments").deleteOne(buildFilter(id));
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("DELETE /api/admin/tournaments/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete tournament" }, { status: 500 });
  }
}
