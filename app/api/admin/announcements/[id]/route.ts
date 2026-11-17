/**
 * PATCH  /api/admin/announcements/{id}  { status: "withdrawn" | "published" }   withdraw (or restore) one
 * DELETE /api/admin/announcements/{id}
 * Only people who may write to that announcement's audience can change it.
 */

import { NextRequest, NextResponse } from "next/server";
import { COL } from "@/lib/announcements/access";
import { loadManageable } from "@/lib/announcements/manage";

type Ctx = { params: Promise<{ id: string }> };

const load = loadManageable;

export async function PATCH(request: NextRequest, { params }: Ctx): Promise<NextResponse> {
  try {
    const { id } = await params;
    const r = await load(id);
    if (r.response) return r.response;
    const body = await request.json().catch(() => ({}));
    if (body?.status !== "withdrawn" && body?.status !== "published") return NextResponse.json({ error: "Unknown status" }, { status: 400 });
    await r.db.collection(COL).updateOne({ announcementId: id }, { $set: { status: body.status, updatedAt: new Date().toISOString() } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("announcements PATCH error:", e);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: Ctx): Promise<NextResponse> {
  try {
    const { id } = await params;
    const r = await load(id);
    if (r.response) return r.response;
    await r.db.collection(COL).deleteOne({ announcementId: id });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("announcements DELETE error:", e);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
