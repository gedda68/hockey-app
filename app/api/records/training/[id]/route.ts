/**
 * PATCH  /api/records/training/{id}   { title?, startAt?, endAt?, location?, focus?, status?, attendance? }  (edit level)
 * DELETE /api/records/training/{id}                                                                        (admin level)
 */

import { NextRequest, NextResponse } from "next/server";
import { recordsContext, isDenied } from "@/lib/records/context";
import { cleanAttendance, cleanTraining } from "@/lib/records/validate";

const COL = "training_sessions";
type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Ctx): Promise<NextResponse> {
  try {
    const c = await recordsContext(request, "training", "edit");
    if (isDenied(c)) return c.response;
    const { id } = await params;
    const existing = await c.db.collection(COL).findOne({ sessionId: id, clubId: c.clubId });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await request.json().catch(() => null);
    const v = cleanTraining(body, true);
    if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });
    const set: Record<string, unknown> = { ...v.value, updatedAt: new Date().toISOString() };

    if ((body as any)?.attendance !== undefined) {
      // Only people on the session's team can be marked (any club member when it isn't tied to a team).
      let allowed: Set<string> | undefined;
      if (existing.teamId) {
        const team = await c.db.collection("teams").findOne({ teamId: existing.teamId, clubId: c.clubId }, { projection: { roster: 1 } });
        allowed = new Set(((team?.roster ?? []) as any[]).map((r) => String(r.memberId)));
      }
      set.attendance = cleanAttendance((body as any).attendance, allowed);
    }
    await c.db.collection(COL).updateOne({ sessionId: id, clubId: c.clubId }, { $set: set });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("training PATCH error:", e);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: Ctx): Promise<NextResponse> {
  try {
    const c = await recordsContext(request, "training", "admin");
    if (isDenied(c)) return c.response;
    const { id } = await params;
    const r = await c.db.collection(COL).deleteOne({ sessionId: id, clubId: c.clubId });
    if (!r.deletedCount) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("training DELETE error:", e);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
