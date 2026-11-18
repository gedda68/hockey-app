/**
 * GET  /api/admin/rsvp   → the requests for teams I can manage, with how many have answered
 * POST /api/admin/rsvp   → ask a team "can you play on <date>?" { teamId, title, matchDate, startsAt?, venue?, fixtureId?, note?, squadSize? }
 */

import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";
import { INVITES, REQUESTS, canManageTeam, manageableTeams } from "@/lib/rsvp/access";
import { cleanRsvp } from "@/lib/rsvp/logic";
import { createRequest, sendFirstAsk } from "@/lib/rsvp/process";
import { todayInZone } from "@/lib/member/availability";

export async function GET(): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const db = await getDatabase();
    const teams = await manageableTeams(session, db);
    if (!teams.length) return NextResponse.json({ error: "You aren't a coach or manager of a team" }, { status: 403 });
    const since = new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10);
    const requests = await db.collection(REQUESTS).find({ teamId: { $in: teams.map((t) => t.teamId) }, matchDate: { $gte: since } }, { projection: { _id: 0 } }).sort({ matchDate: 1 }).limit(200).toArray();
    const counts = await db.collection(INVITES).aggregate([
      { $match: { requestId: { $in: requests.map((r) => r.requestId) } } },
      { $group: { _id: { r: "$requestId", a: { $ifNull: ["$response", "none"] } }, n: { $sum: 1 } } },
    ]).toArray();
    const by = new Map<string, Record<string, number>>();
    for (const c of counts) by.set(c._id.r, { ...(by.get(c._id.r) ?? {}), [c._id.a]: c.n });
    return NextResponse.json({ requests: requests.map((r) => ({ ...r, counts: { in: 0, maybe: 0, out: 0, none: 0, ...(by.get(String(r.requestId)) ?? {}) } })) });
  } catch (e) {
    console.error("rsvp list error:", e);
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const body = await request.json().catch(() => null);
    const db = await getDatabase();
    const teamId = String(body?.teamId ?? "");
    const team = (await manageableTeams(session, db)).find((t) => t.teamId === teamId);
    if (!team || !(await canManageTeam(session, teamId, db))) return NextResponse.json({ error: "You can't ask that team" }, { status: 403 });
    const v = cleanRsvp(body, todayInZone());
    if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });
    const by = { id: String(session.memberId ?? session.userId ?? ""), name: String(session.name ?? session.email ?? "") };
    const { requestId, invited } = await createRequest(db, v.value, team, by);
    if (invited === 0) return NextResponse.json({ requestId, invited, emailed: 0, warning: "That team has no players on its roster yet" }, { status: 201 });
    const emailed = await sendFirstAsk(db, requestId);
    return NextResponse.json({ requestId, invited, emailed }, { status: 201 });
  } catch (e) {
    console.error("rsvp create error:", e);
    return NextResponse.json({ error: "Failed to send" }, { status: 500 });
  }
}
