/**
 * GET  /api/member/shifts   → my shifts, and shifts at my club that need people or cover
 * POST /api/member/shifts   { shiftId, action: "signup" | "takeover" | "release" | "swap" | "keep" }
 */

import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";
import { resolveSessionMemberId } from "@/lib/auth/sessionMember";
import { SHIFTS, SIGNUPS, clubOfMember } from "@/lib/volunteers/access";
import { fill, shiftStartMs } from "@/lib/volunteers/logic";
import { keepShift, join, release } from "@/lib/volunteers/service";
import { todayInZone } from "@/lib/member/availability";

export async function GET(): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const db = await getDatabase();
    const me = await resolveSessionMemberId(db, session);
    if (!me) return NextResponse.json({ club: null, mine: [], open: [] });
    const club = await clubOfMember(db, me);
    const today = todayInZone();
    const now = Date.now();
    const my = await db.collection(SIGNUPS).find({ memberId: me, status: { $in: ["confirmed", "swap_requested"] } }).limit(200).toArray();
    const ids = new Set(my.map((m) => String(m.shiftId)));
    const clubShifts = club ? await db.collection(SHIFTS).find({ clubId: club.clubId, status: "open", date: { $gte: today } }, { projection: { _id: 0 } }).sort({ date: 1, startTime: 1 }).limit(300).toArray() : [];
    const mineOutsideClub = [...ids].filter((id) => !clubShifts.some((s) => s.shiftId === id));
    const extra = mineOutsideClub.length ? await db.collection(SHIFTS).find({ shiftId: { $in: mineOutsideClub }, status: "open", date: { $gte: today } }, { projection: { _id: 0 } }).toArray() : [];
    const all = [...clubShifts, ...extra];
    const signups = await db.collection(SIGNUPS).find({ shiftId: { $in: all.map((s) => String(s.shiftId)) }, status: { $in: ["confirmed", "swap_requested"] } }, { projection: { shiftId: 1, memberId: 1, status: 1, name: 1 } }).toArray();
    const by = new Map<string, typeof signups>();
    for (const s of signups) by.set(String(s.shiftId), [...(by.get(String(s.shiftId)) ?? []), s]);
    const view = (s: (typeof all)[number]) => {
      const list = by.get(String(s.shiftId)) ?? [];
      const mineRow = list.find((x) => x.memberId === me);
      const f = fill(Number(s.slots), list as never);
      return { ...s, ...f, mine: mineRow ? mineRow.status : null, withMe: list.map((x) => (x.memberId === me ? "You" : String(x.name ?? "")).trim()).filter(Boolean), startsAt: new Date(shiftStartMs(s as never)).toISOString() };
    };
    const rows = all.map(view);
    return NextResponse.json({
      club: club ? { id: club.clubId, name: club.name } : null,
      mine: rows.filter((r) => r.mine).sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
      open: rows.filter((r) => !r.mine && (r.free > 0 || r.needCover > 0) && shiftStartMs(r as never) > now).sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
    });
  } catch (e) {
    console.error("member shifts error:", e);
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const db = await getDatabase();
    const me = await resolveSessionMemberId(db, session);
    if (!me) return NextResponse.json({ error: "No member profile on this account" }, { status: 400 });
    const { shiftId, action } = (await request.json().catch(() => ({}))) as { shiftId?: string; action?: string };
    if (!shiftId) return NextResponse.json({ error: "shiftId is required" }, { status: 400 });
    // Sign-up is for members of the shift's club.
    if (action === "signup" || action === "takeover") {
      const shift = await db.collection(SHIFTS).findOne({ shiftId }, { projection: { clubId: 1 } });
      const club = await clubOfMember(db, me);
      if (!shift || !club || club.clubId !== shift.clubId) return NextResponse.json({ error: "That shift is for another club's members" }, { status: 403 });
    }
    const r = action === "signup" ? await join(db, shiftId, me, "signup")
      : action === "takeover" ? await join(db, shiftId, me, "takeover")
      : action === "release" ? await release(db, shiftId, me)
      : action === "swap" ? await release(db, shiftId, me, new Date(), true)
      : action === "keep" ? await keepShift(db, shiftId, me)
      : null;
    if (!r) return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    return r.ok ? NextResponse.json({ ok: true, message: r.message }) : NextResponse.json({ error: r.error }, { status: r.status });
  } catch (e) {
    console.error("member shifts action error:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
