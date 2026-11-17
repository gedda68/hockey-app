/**
 * GET    /api/member/my-availability          → my entries that haven't finished yet
 * POST   { kind, from, to, note? }            → add one
 * DELETE ?id=<availabilityId>                  → remove one of mine
 * Collection: member_availability. Always scoped to the signed-in member.
 */

import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";
import { resolveSessionMemberId } from "@/lib/auth/sessionMember";
import { cleanAvailability } from "@/lib/member/availability";

const COL = "member_availability";
const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Australia/Brisbane" });

async function who() {
  const session = await getSession();
  if (!session) return { ok: false, response: NextResponse.json({ error: "Authentication required" }, { status: 401 }) } as const;
  const db = await getDatabase();
  const me = await resolveSessionMemberId(db, session);
  if (!me) return { ok: false, response: NextResponse.json({ error: "No member profile on this account" }, { status: 400 }) } as const;
  return { ok: true, db, me } as const;
}

export async function GET(): Promise<NextResponse> {
  try {
    const w = await who();
    if (!w.ok) return w.response;
    const entries = await w.db.collection(COL).find({ memberId: w.me, to: { $gte: today() } }, { projection: { _id: 0 } }).sort({ from: 1 }).limit(200).toArray();
    return NextResponse.json({ entries });
  } catch (e) {
    console.error("my-availability GET error:", e);
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const w = await who();
    if (!w.ok) return w.response;
    const v = cleanAvailability(await request.json().catch(() => null), today());
    if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });
    const entry = {
      availabilityId: `AV-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      memberId: w.me,
      ...v.value,
      createdAt: new Date().toISOString(),
    };
    await w.db.collection(COL).insertOne({ ...entry });
    return NextResponse.json({ success: true, entry }, { status: 201 });
  } catch (e) {
    console.error("my-availability POST error:", e);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    const w = await who();
    if (!w.ok) return w.response;
    const id = new URL(request.url).searchParams.get("id") ?? "";
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
    const r = await w.db.collection(COL).deleteOne({ availabilityId: id, memberId: w.me });
    if (!r.deletedCount) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("my-availability DELETE error:", e);
    return NextResponse.json({ error: "Failed to remove" }, { status: 500 });
  }
}
