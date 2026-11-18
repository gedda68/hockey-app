/** POST /api/admin/surveys/{id}/close — stop taking answers now. */

import { NextRequest, NextResponse } from "next/server";
import { COL } from "@/lib/surveys/access";
import { loadManaged } from "@/lib/surveys/manage";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  try {
    const r = await loadManaged((await params).id);
    if (!r.ok) return r.res;
    if (r.survey.status === "draft") return NextResponse.json({ error: "Publish it first, or delete the draft" }, { status: 409 });
    if (r.survey.status === "closed") return NextResponse.json({ success: true });
    const now = new Date().toISOString();
    await r.db.collection(COL).updateOne({ surveyId: r.survey.surveyId }, { $set: { status: "closed", closedAt: now, updatedAt: now } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("survey close error:", e);
    return NextResponse.json({ error: "Failed to close" }, { status: 500 });
  }
}
