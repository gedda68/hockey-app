// app/api/admin/nominations/[id]/route.ts
// PATCH - update nomination status or notes
// DELETE - remove a nomination

import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import type { NominationStatus } from "@/types/nominations";

// ─── PATCH /api/admin/nominations/[id] ───────────────────────────────────────
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, notes, nominatedBy } = body as {
      status?: NominationStatus;
      notes?: string;
      nominatedBy?: string;
    };

    const validStatuses: NominationStatus[] = [
      "pending",
      "accepted",
      "withdrawn",
      "rejected",
    ];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` },
        { status: 400 },
      );
    }

    const client = await clientPromise;
    const db = client.db("hockey-app");

    const updateFields: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (status !== undefined) updateFields.status = status;
    if (notes !== undefined) updateFields.notes = notes;
    if (nominatedBy !== undefined) updateFields.nominatedBy = nominatedBy;

    // Support both MongoDB _id and our nominationId field
    const filter = ObjectId.isValid(id)
      ? { _id: new ObjectId(id) }
      : { nominationId: id };

    const result = await db
      .collection("rep_nominations")
      .findOneAndUpdate(filter, { $set: updateFields }, { returnDocument: "after" });

    if (!result) {
      return NextResponse.json({ error: "Nomination not found" }, { status: 404 });
    }

    return NextResponse.json({ ...result, _id: result._id.toString() });
  } catch (error: any) {
    console.error("PATCH /api/admin/nominations/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update nomination" },
      { status: 500 },
    );
  }
}

// ─── DELETE /api/admin/nominations/[id] ──────────────────────────────────────
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const client = await clientPromise;
    const db = client.db("hockey-app");

    const filter = ObjectId.isValid(id)
      ? { _id: new ObjectId(id) }
      : { nominationId: id };

    const result = await db.collection("rep_nominations").deleteOne(filter);

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Nomination not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE /api/admin/nominations/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete nomination" },
      { status: 500 },
    );
  }
}
