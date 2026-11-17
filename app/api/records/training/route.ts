/**
 * Training sessions for a club.
 *   GET  ?from=&to=&teamId=   → sessions (people at "own" level see only sessions they're marked in, with only their own row)
 *   GET  ?teams=1             → the club's teams, to pick from (edit level)
 *   GET  ?roster=<teamId>     → who is on that team, for taking attendance (edit level)
 *   POST { title, startAt, endAt?, teamId?, location?, focus? }  → schedule one (edit level)
 * Collection: training_sessions.
 */

import { NextRequest, NextResponse } from "next/server";
import { recordsContext, isDenied } from "@/lib/records/context";
import { atLeast } from "@/lib/records/access";
import { cleanTraining } from "@/lib/records/validate";

const COL = "training_sessions";
const nameOf = (m: any) => `${m?.personalInfo?.firstName ?? m?.firstName ?? ""} ${m?.personalInfo?.lastName ?? m?.lastName ?? ""}`.trim() || String(m?.memberId ?? "");

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const c = await recordsContext(request, "training", "own");
    if (isDenied(c)) return c.response;
    const sp = new URL(request.url).searchParams;
    const canEdit = atLeast(c.level, "edit");

    if (sp.get("teams") === "1" || sp.get("roster")) {
      if (!canEdit) return NextResponse.json({ error: "Your role doesn't allow this here" }, { status: 403 });
      if (sp.get("teams") === "1") {
        const teams = await c.db.collection("teams").find({ clubId: c.clubId, status: { $ne: "archived" } }, { projection: { teamId: 1, name: 1, displayName: 1 } }).limit(200).toArray();
        return NextResponse.json({ teams: teams.map((t) => ({ teamId: String(t.teamId), name: String(t.displayName || t.name || t.teamId) })) });
      }
      const team = await c.db.collection("teams").findOne({ teamId: sp.get("roster"), clubId: c.clubId }, { projection: { roster: 1 } });
      const ids = ((team?.roster ?? []) as any[]).filter((r) => r?.memberId && (!r.status || r.status === "active")).map((r) => String(r.memberId));
      const people = ids.length ? await c.db.collection("members").find({ memberId: { $in: ids } }, { projection: { memberId: 1, personalInfo: 1 } }).toArray() : [];
      return NextResponse.json({ players: people.map((m) => ({ memberId: String(m.memberId), name: nameOf(m) })).sort((a, b) => a.name.localeCompare(b.name)) });
    }

    const q: Record<string, unknown> = { clubId: c.clubId };
    if (sp.get("teamId")) q.teamId = sp.get("teamId");
    const range: Record<string, string> = {};
    if (sp.get("from")) range.$gte = new Date(String(sp.get("from"))).toISOString();
    if (sp.get("to")) range.$lte = new Date(String(sp.get("to"))).toISOString();
    if (Object.keys(range).length) q.startAt = range;
    if (!atLeast(c.level, "read")) q["attendance.memberId"] = c.me || "__none__";

    const rows = await c.db.collection(COL).find(q, { projection: { _id: 0 } }).sort({ startAt: -1 }).limit(200).toArray();
    const sessions = atLeast(c.level, "read")
      ? rows
      : rows.map((r) => ({ ...r, attendance: ((r.attendance ?? []) as any[]).filter((a) => a.memberId === c.me) }));
    return NextResponse.json({ sessions, level: c.level });
  } catch (e) {
    console.error("training GET error:", e);
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const c = await recordsContext(request, "training", "edit");
    if (isDenied(c)) return c.response;
    const v = cleanTraining(await request.json().catch(() => null));
    if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });
    if (v.value.teamId) {
      const team = await c.db.collection("teams").findOne({ teamId: v.value.teamId, clubId: c.clubId }, { projection: { teamId: 1 } });
      if (!team) return NextResponse.json({ error: "That team isn't in this club" }, { status: 400 });
    }
    const now = new Date().toISOString();
    const doc = {
      sessionId: `TRN-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      clubId: c.clubId,
      ...v.value,
      teamId: v.value.teamId ?? null,
      status: v.value.status ?? "scheduled",
      attendance: [] as unknown[],
      createdBy: c.me || c.session.userId,
      createdByName: c.session.name,
      createdAt: now,
      updatedAt: now,
    };
    await c.db.collection(COL).insertOne({ ...doc });
    return NextResponse.json({ success: true, session: doc }, { status: 201 });
  } catch (e) {
    console.error("training POST error:", e);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}
