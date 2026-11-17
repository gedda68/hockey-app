/**
 * PATCH /api/records/incidents/{id}  { status?, note? }  (edit level)
 * Closing or escalating a report needs admin level. Every change is added to the report's timeline.
 */

import { NextRequest, NextResponse } from "next/server";
import { recordsContext, isDenied } from "@/lib/records/context";
import { atLeast } from "@/lib/records/access";
import { cleanIncidentUpdate } from "@/lib/records/validate";

const COL = "club_incidents";
type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Ctx): Promise<NextResponse> {
  try {
    const c = await recordsContext(request, "incidents", "edit");
    if (isDenied(c)) return c.response;
    const { id } = await params;
    const v = cleanIncidentUpdate(await request.json().catch(() => null));
    if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });
    if ((v.value.status === "closed" || v.value.status === "escalated") && !atLeast(c.level, "admin")) {
      return NextResponse.json({ error: "Only an administrator can close or escalate a report" }, { status: 403 });
    }
    const now = new Date().toISOString();
    const r = await c.db.collection(COL).updateOne(
      { incidentId: id, clubId: c.clubId },
      {
        $set: { updatedAt: now, ...(v.value.status ? { status: v.value.status } : {}) },
        $push: { timeline: { at: now, by: c.session.name, ...(v.value.status ? { status: v.value.status } : {}), ...(v.value.note ? { note: v.value.note } : {}) } } as never,
      },
    );
    if (!r.matchedCount) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("incidents PATCH error:", e);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}
