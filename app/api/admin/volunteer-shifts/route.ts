/**
 * GET  /api/admin/volunteer-shifts?clubId=   → the club's shifts (a week back and onward) with who is on each
 * POST /api/admin/volunteer-shifts           → create a shift, optionally repeated weekly { kind, label?, date, startTime, endTime, slots, location?, notes?, repeatWeeks? }
 */

import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";
import { SHIFTS, SIGNUPS, coordinatedClub } from "@/lib/volunteers/access";
import { cleanShift, fill, shiftStartMs } from "@/lib/volunteers/logic";
import { newId } from "@/lib/volunteers/service";
import { todayInZone } from "@/lib/member/availability";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const db = await getDatabase();
    const club = await coordinatedClub(session, db, request.nextUrl.searchParams.get("clubId"));
    if (!club) return NextResponse.json({ error: "You can't manage volunteer shifts" }, { status: 403 });
    const since = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
    const shifts = await db.collection(SHIFTS).find({ clubId: club.clubId, date: { $gte: since } }, { projection: { _id: 0 } }).sort({ date: 1, startTime: 1 }).limit(400).toArray();
    const signups = await db.collection(SIGNUPS).find({ shiftId: { $in: shifts.map((s) => String(s.shiftId)) }, status: { $in: ["confirmed", "swap_requested"] } }, { projection: { _id: 0, remindersSent: 0 } }).toArray();
    const by = new Map<string, typeof signups>();
    for (const s of signups) by.set(String(s.shiftId), [...(by.get(String(s.shiftId)) ?? []), s]);
    return NextResponse.json({
      club: { id: club.clubId, name: club.name },
      today: todayInZone(),
      shifts: shifts.map((s) => ({ ...s, people: by.get(String(s.shiftId)) ?? [], ...fill(Number(s.slots), (by.get(String(s.shiftId)) ?? []) as never), startsAt: new Date(shiftStartMs(s as never)).toISOString() })),
    });
  } catch (e) {
    console.error("admin shifts list error:", e);
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const body = await request.json().catch(() => null);
    const db = await getDatabase();
    const club = await coordinatedClub(session, db, body?.clubId);
    if (!club) return NextResponse.json({ error: "You can't manage volunteer shifts" }, { status: 403 });
    const v = cleanShift(body, todayInZone());
    if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });
    const now = new Date().toISOString();
    const groupId = v.dates.length > 1 ? newId("VG") : undefined;
    const docs = v.dates.map((date) => ({ shiftId: newId("VSH"), clubId: club.clubId, clubName: club.name, ...v.value, date, ...(groupId ? { groupId } : {}), status: "open", createdBy: String(session.memberId ?? session.userId ?? ""), createdAt: now }));
    await db.collection(SHIFTS).insertMany(docs.map((d) => ({ ...d })));
    return NextResponse.json({ created: docs.length, shiftIds: docs.map((d) => d.shiftId) }, { status: 201 });
  } catch (e) {
    console.error("admin shift create error:", e);
    return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  }
}
