/**
 * GET    /api/admin/rsvp/<id>   → who is in, maybe, out, away and hasn't answered
 * POST   { action: "remind" | "sync" | "close" | "reopen" }
 * DELETE                          → remove the request and its answers
 */

import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";
import { INVITES, REQUESTS, canManageTeam } from "@/lib/rsvp/access";
import { summarise, matchStartMs, type SummaryRow } from "@/lib/rsvp/logic";
import { createInvites, remindNow, sendFirstAsk } from "@/lib/rsvp/process";

type Ctx = { params: Promise<{ id: string }> };

async function load(id: string) {
  const session = await getSession();
  if (!session) return { ok: false, res: NextResponse.json({ error: "Authentication required" }, { status: 401 }) } as const;
  const db = await getDatabase();
  const req = await db.collection(REQUESTS).findOne({ requestId: id }, { projection: { _id: 0 } });
  if (!req) return { ok: false, res: NextResponse.json({ error: "Not found" }, { status: 404 }) } as const;
  if (!(await canManageTeam(session, String(req.teamId), db))) return { ok: false, res: NextResponse.json({ error: "That isn't yours to manage" }, { status: 403 }) } as const;
  return { ok: true, db, req, session } as const;
}

export async function GET(_r: NextRequest, { params }: Ctx): Promise<NextResponse> {
  try {
    const l = await load((await params).id);
    if (!l.ok) return l.res;
    const invites = await l.db.collection(INVITES).find({ requestId: String(l.req.requestId) }, { projection: { _id: 0, token: 0 } }).limit(500).toArray();
    const away = await l.db.collection("member_availability").find({ memberId: { $in: invites.map((i) => String(i.playerId)) }, kind: "unavailable", from: { $lte: String(l.req.matchDate) }, to: { $gte: String(l.req.matchDate) } }, { projection: { memberId: 1 } }).toArray();
    const rows = invites.map((i) => ({
      inviteId: String(i.inviteId), memberId: String(i.playerId), name: String(i.playerName), answer: i.response as SummaryRow["answer"], note: (i.note as string) || undefined,
      respondedAt: i.respondedAt as string | undefined, answeredByParent: !!i.parentView, remindersSent: Number(i.remindersSent ?? 0), status: String(i.status),
    }));
    const summary = summarise(rows, (l.req.squadSize as number | null) ?? null, new Set(away.map((a) => String(a.memberId))));
    return NextResponse.json({ request: { ...l.req, canRemind: l.req.status === "open" && Date.now() < matchStartMs(l.req as never) }, summary });
  } catch (e) {
    console.error("rsvp get error:", e);
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: Ctx): Promise<NextResponse> {
  try {
    const l = await load((await params).id);
    if (!l.ok) return l.res;
    const { action } = (await request.json().catch(() => ({}))) as { action?: string };
    const id = String(l.req.requestId);
    if (action === "remind") return NextResponse.json({ reminded: await remindNow(l.db, id) });
    if (action === "sync") {
      const r = await createInvites(l.db, { requestId: id, teamId: String(l.req.teamId) });
      const emailed = await sendFirstAsk(l.db, id);
      return NextResponse.json({ added: r.added, emailed });
    }
    if (action === "close") { await l.db.collection(REQUESTS).updateOne({ requestId: id }, { $set: { status: "closed", closedAt: new Date().toISOString() } }); return NextResponse.json({ ok: true }); }
    if (action === "reopen") {
      if (Date.now() >= matchStartMs(l.req as never)) return NextResponse.json({ error: "The match has already started" }, { status: 400 });
      await l.db.collection(REQUESTS).updateOne({ requestId: id }, { $set: { status: "open" }, $unset: { closedAt: "" } });
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    console.error("rsvp action error:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function DELETE(_r: NextRequest, { params }: Ctx): Promise<NextResponse> {
  try {
    const l = await load((await params).id);
    if (!l.ok) return l.res;
    const id = String(l.req.requestId);
    await l.db.collection(INVITES).deleteMany({ requestId: id });
    await l.db.collection(REQUESTS).deleteOne({ requestId: id });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("rsvp delete error:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
