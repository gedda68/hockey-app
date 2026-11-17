/**
 * PATCH  /api/admin/announcements/{id}  { status: "withdrawn" | "published" }   withdraw (or restore) one
 * DELETE /api/admin/announcements/{id}
 * Only people who may write to that announcement's audience can change it.
 */

import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";
import { canWriteTo, COL, writableAudiences } from "@/lib/announcements/access";

type Ctx = { params: Promise<{ id: string }> };

type Loaded = { response: NextResponse } | { response?: undefined; db: Awaited<ReturnType<typeof getDatabase>> };

async function load(id: string): Promise<Loaded> {
  const session = await getSession();
  if (!session) return { response: NextResponse.json({ error: "Authentication required" }, { status: 401 }) };
  const audiences = await writableAudiences(session);
  if (!audiences) return { response: NextResponse.json({ error: "You can't manage announcements" }, { status: 403 }) };
  const db = await getDatabase();
  const row = await db.collection(COL).findOne({ announcementId: id });
  if (!row) return { response: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  if (!audiences.includes(row.level) || !(await canWriteTo(session, row.level, String(row.scopeId ?? "")))) {
    return { response: NextResponse.json({ error: "You can't change that announcement" }, { status: 403 }) };
  }
  return { db };
}

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
