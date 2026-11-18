/** GET /api/member/awards/members?q=jo  → members of my club whose name matches (for choosing a nominee). */
import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";
import { resolveSessionMemberId } from "@/lib/auth/sessionMember";
import { clubOfMember } from "@/lib/volunteers/access";
import { memberBelongsToClubFilter } from "@/lib/rosters/memberClubQuery";

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const db = await getDatabase();
    const me = await resolveSessionMemberId(db, session);
    const club = me ? await clubOfMember(db, me) : null;
    const q = String(request.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 40);
    if (!me || !club || q.length < 2) return NextResponse.json({ members: [] });
    const rx = new RegExp(esc(q), "i");
    const rows = await db.collection("members").find({ $and: [memberBelongsToClubFilter(club.clubId), { memberId: { $ne: me } }, { $or: [{ "personalInfo.firstName": rx }, { "personalInfo.lastName": rx }] }] }, { projection: { memberId: 1, personalInfo: 1 } }).limit(15).toArray();
    return NextResponse.json({ members: rows.map((m: any) => ({ memberId: String(m.memberId), name: `${m.personalInfo?.firstName ?? ""} ${m.personalInfo?.lastName ?? ""}`.trim() })) });
  } catch (e) {
    console.error("award member search error:", e);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
