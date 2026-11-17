/**
 * Incident reports for a club. Anyone in the club can report one; the people who run the club see them all.
 *   GET  ?status=   → reports (people at "own" level see only the ones they reported)
 *   POST { occurredAt, category, description, location?, severity?, peopleInvolved?, actionTaken?, confidential? }
 * Collection: club_incidents. Conduct and child-safety reports are always confidential.
 */

import { NextRequest, NextResponse } from "next/server";
import { recordsContext, isDenied } from "@/lib/records/context";
import { atLeast } from "@/lib/records/access";
import { cleanIncident } from "@/lib/records/validate";

const COL = "club_incidents";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const c = await recordsContext(request, "incidents", "own");
    if (isDenied(c)) return c.response;
    const sp = new URL(request.url).searchParams;
    const q: Record<string, unknown> = { clubId: c.clubId };
    if (sp.get("status")) q.status = sp.get("status");
    if (!atLeast(c.level, "read")) q.reportedBy = c.me || c.session.userId;
    const incidents = await c.db.collection(COL).find(q, { projection: { _id: 0 } }).sort({ occurredAt: -1 }).limit(300).toArray();
    return NextResponse.json({ incidents, level: c.level });
  } catch (e) {
    console.error("incidents GET error:", e);
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const c = await recordsContext(request, "incidents", "own");
    if (isDenied(c)) return c.response;
    const v = cleanIncident(await request.json().catch(() => null));
    if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });
    const now = new Date().toISOString();
    const doc = {
      incidentId: `INC-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      clubId: c.clubId,
      ...v.value,
      status: "reported",
      reportedBy: c.me || c.session.userId,
      reportedByName: c.session.name,
      createdAt: now,
      updatedAt: now,
      timeline: [{ at: now, by: c.session.name, status: "reported", note: "Report lodged" }],
    };
    await c.db.collection(COL).insertOne({ ...doc });
    return NextResponse.json({ success: true, incident: { incidentId: doc.incidentId, status: doc.status } }, { status: 201 });
  } catch (e) {
    console.error("incidents POST error:", e);
    return NextResponse.json({ error: "Failed to submit" }, { status: 500 });
  }
}
