/** GET /api/member/rsvp → "can you play?" requests for me (and my children, as their parent): upcoming, with my answer. */

import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";
import { resolveSessionMemberId } from "@/lib/auth/sessionMember";
import { INVITES, REQUESTS } from "@/lib/rsvp/access";
import { describeInvite } from "@/lib/rsvp/respond";
import { todayInZone } from "@/lib/member/availability";

export async function GET(): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const db = await getDatabase();
    const me = await resolveSessionMemberId(db, session);
    if (!me) return NextResponse.json({ requests: [] });
    const invites = await db.collection(INVITES).find({ notify: me }, { projection: { inviteId: 1, requestId: 1 } }).sort({ createdAt: -1 }).limit(100).toArray();
    const today = todayInZone();
    const live = new Set((await db.collection(REQUESTS).find({ requestId: { $in: invites.map((i) => String(i.requestId)) }, matchDate: { $gte: today } }, { projection: { requestId: 1 } }).toArray()).map((r) => String(r.requestId)));
    const out = [];
    for (const i of invites) if (live.has(String(i.requestId))) { const d = await describeInvite(db, { inviteId: i.inviteId }); if (d) out.push(d); }
    out.sort((a, b) => a.matchDate.localeCompare(b.matchDate));
    return NextResponse.json({ requests: out });
  } catch (e) {
    console.error("member rsvp error:", e);
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }
}
