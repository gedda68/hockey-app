/**
 * PATCH  /api/admin/announcements/{id}  { status: "withdrawn" | "published" }   withdraw (or restore) one
 * DELETE /api/admin/announcements/{id}
 * Only people who may write to that announcement's audience can change it.
 */

import { NextRequest, NextResponse } from "next/server";
import { COL } from "@/lib/announcements/access";
import { loadManageable } from "@/lib/announcements/manage";
import { POSTS, withdrawPost } from "@/lib/social/posts";
import type { Db } from "mongodb";

/** Cancels queued, and takes down published, page posts made from this announcement. Never throws. */
async function withdrawSocial(db: Db, announcementId: string): Promise<number> {
  let n = 0;
  try {
    const posts = await db.collection(POSTS).find({ "source.type": "announcement", "source.id": announcementId, status: { $in: ["queued", "posted", "failed"] } }).toArray();
    for (const p of posts) { try { if ((await withdrawPost(db, p)) !== "nothing") n++; } catch (e) { console.error("withdraw social post failed:", e); } }
  } catch (e) { console.error("withdraw social posts failed:", e); }
  return n;
}

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
    const socialRemoved = body.status === "withdrawn" ? await withdrawSocial(r.db, id) : 0;
    return NextResponse.json({ success: true, socialRemoved });
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
    const socialRemoved = await withdrawSocial(r.db, id);
    await r.db.collection(COL).deleteOne({ announcementId: id });
    return NextResponse.json({ success: true, socialRemoved });
  } catch (e) {
    console.error("announcements DELETE error:", e);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
