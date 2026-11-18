/**
 * PUT    /api/admin/volunteer-shifts/<id>   → change time, people needed, location, notes
 * POST   { action: "assign", memberId } | { action: "remove", signupId }
 * DELETE                                      → cancel the shift (its volunteers drop off)
 */

import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";
import { SHIFTS, SIGNUPS, clubOfMember, coordinatedClub } from "@/lib/volunteers/access";
import { cleanShift } from "@/lib/volunteers/logic";
import { join } from "@/lib/volunteers/service";

type Ctx = { params: Promise<{ id: string }> };

async function load(id: string) {
  const session = await getSession();
  if (!session) return { ok: false, res: NextResponse.json({ error: "Authentication required" }, { status: 401 }) } as const;
  const db = await getDatabase();
  const shift = await db.collection(SHIFTS).findOne({ shiftId: id }, { projection: { _id: 0 } });
  if (!shift) return { ok: false, res: NextResponse.json({ error: "Shift not found" }, { status: 404 }) } as const;
  const club = await coordinatedClub(session, db, String(shift.clubId));
  if (!club) return { ok: false, res: NextResponse.json({ error: "That isn't yours to manage" }, { status: 403 }) } as const;
  return { ok: true, db, shift, session, club } as const;
}

export async function PUT(request: NextRequest, { params }: Ctx): Promise<NextResponse> {
  try {
    const l = await load((await params).id);
    if (!l.ok) return l.res;
    const body = await request.json().catch(() => ({}));
    const v = cleanShift({ ...l.shift, ...body, date: body?.date ?? l.shift.date, repeatWeeks: 0 }, "0000-00-00");
    if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });
    const held = await l.db.collection(SIGNUPS).countDocuments({ shiftId: String(l.shift.shiftId), status: { $in: ["confirmed", "swap_requested"] } });
    if (v.value.slots < held) return NextResponse.json({ error: `${held} people are already on this shift. Remove someone first, or keep at least ${held} places.` }, { status: 409 });
    await l.db.collection(SHIFTS).updateOne({ shiftId: String(l.shift.shiftId) }, { $set: { ...v.value, updatedAt: new Date().toISOString() } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("admin shift update error:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: Ctx): Promise<NextResponse> {
  try {
    const l = await load((await params).id);
    if (!l.ok) return l.res;
    const body = (await request.json().catch(() => ({}))) as { action?: string; memberId?: string; signupId?: string };
    const shiftId = String(l.shift.shiftId);
    if (body.action === "assign") {
      const mid = String(body.memberId ?? "");
      const club = await clubOfMember(l.db, mid);
      if (!club || club.clubId !== l.club.clubId) return NextResponse.json({ error: "That person isn't a member of this club" }, { status: 400 });
      const r = await join(l.db, shiftId, mid, "signup", new Date(), String(l.session.memberId ?? ""));
      return r.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: r.error }, { status: r.status });
    }
    if (body.action === "remove") {
      const r = await l.db.collection(SIGNUPS).updateOne({ signupId: String(body.signupId ?? ""), shiftId, status: { $in: ["confirmed", "swap_requested"] } }, { $set: { status: "removed", removedAt: new Date().toISOString() } });
      return r.matchedCount ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    console.error("admin shift action error:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function DELETE(_r: NextRequest, { params }: Ctx): Promise<NextResponse> {
  try {
    const l = await load((await params).id);
    if (!l.ok) return l.res;
    const shiftId = String(l.shift.shiftId);
    await l.db.collection(SHIFTS).updateOne({ shiftId }, { $set: { status: "cancelled", cancelledAt: new Date().toISOString() } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("admin shift cancel error:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
