/**
 * PATCH  /api/records/injuries/{id}  { status?, expectedReturn?, note? }  (edit level) - adds to the injury's history
 * DELETE /api/records/injuries/{id}                                        (admin level)
 */

import { NextRequest, NextResponse } from "next/server";
import { recordsContext, isDenied } from "@/lib/records/context";
import { cleanInjuryUpdate } from "@/lib/records/validate";

const COL = "member_injuries";
type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Ctx): Promise<NextResponse> {
  try {
    const c = await recordsContext(request, "injuries", "edit");
    if (isDenied(c)) return c.response;
    const { id } = await params;
    const v = cleanInjuryUpdate(await request.json().catch(() => null));
    if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });
    const now = new Date().toISOString();
    const set: Record<string, unknown> = { updatedAt: now };
    if (v.value.status) { set.status = v.value.status; set.clearedAt = v.value.status === "cleared" ? now : null; }
    if (v.value.expectedReturn !== undefined) set.expectedReturn = v.value.expectedReturn;
    const r = await c.db.collection(COL).updateOne(
      { injuryId: id, clubId: c.clubId },
      { $set: set, $push: { history: { at: now, by: c.session.name, ...(v.value.status ? { status: v.value.status } : {}), ...(v.value.note ? { note: v.value.note } : {}) } } as never },
    );
    if (!r.matchedCount) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("injuries PATCH error:", e);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: Ctx): Promise<NextResponse> {
  try {
    const c = await recordsContext(request, "injuries", "admin");
    if (isDenied(c)) return c.response;
    const { id } = await params;
    const r = await c.db.collection(COL).deleteOne({ injuryId: id, clubId: c.clubId });
    if (!r.deletedCount) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("injuries DELETE error:", e);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
