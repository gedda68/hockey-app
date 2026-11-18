/** GET /api/admin/volunteer-shifts/members?q=&clubId= → club members matching a name, to put on a shift. */

import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";
import { coordinatedClub } from "@/lib/volunteers/access";
import { memberBelongsToClubFilter } from "@/lib/rosters/memberClubQuery";

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const db = await getDatabase();
    const club = await coordinatedClub(session, db, request.nextUrl.searchParams.get("clubId"));
    if (!club) return NextResponse.json({ error: "You can't manage volunteer shifts" }, { status: 403 });
    const q = (request.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 40);
    if (q.length < 2) return NextResponse.json({ members: [] });
    const rx = new RegExp(esc(q), "i");
    const rows = await db.collection("members").find({ $and: [memberBelongsToClubFilter(club.clubId), { "membership.status": { $nin: ["Inactive", "inactive"] } }, { $or: [{ "personalInfo.firstName": rx }, { "personalInfo.lastName": rx }, { firstName: rx }, { lastName: rx }] }] }, { projection: { memberId: 1, personalInfo: 1, firstName: 1, lastName: 1 } }).limit(15).toArray();
    return NextResponse.json({ members: rows.map((m: any) => ({ memberId: String(m.memberId), name: `${m.personalInfo?.firstName ?? m.firstName ?? ""} ${m.personalInfo?.lastName ?? m.lastName ?? ""}`.trim() })) });
  } catch (e) {
    console.error("shift member search error:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
