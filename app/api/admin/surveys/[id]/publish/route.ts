/**
 * POST /api/admin/surveys/{id}/publish
 * Works out who the survey goes to, gives each person their private link, and opens it (now, or at its opening time).
 * Emails go out straight away when it opens now, otherwise when it opens (hourly job).
 */

import { NextRequest, NextResponse } from "next/server";
import { COL } from "@/lib/surveys/access";
import { loadManaged } from "@/lib/surveys/manage";
import { createInvites, processDueSurveys } from "@/lib/surveys/process";
import { cleanSurvey } from "@/lib/surveys/validate";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  try {
    const r = await loadManaged((await params).id);
    if (!r.ok) return r.res;
    const s = r.survey;
    if (s.status !== "draft") return NextResponse.json({ error: "This survey has already been published" }, { status: 409 });
    const now = new Date();
    // The opening time may have passed while it sat as a draft: open it now, keeping the length it was given.
    const length = Date.parse(s.closesAt) - Date.parse(s.opensAt);
    const opensAt = Date.parse(s.opensAt) < now.getTime() ? now.toISOString() : s.opensAt;
    const closesAt = Date.parse(s.closesAt) <= now.getTime() ? new Date(now.getTime() + Math.max(length, 86400000)).toISOString() : s.closesAt;
    const v = cleanSurvey({ ...s, opensAt, closesAt }, now);
    if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });

    const invites = await createInvites(r.db, { ...s, ...v.value } as typeof s, now);
    if (invites.total === 0) return NextResponse.json({ error: "Nobody matches that audience, so there is no one to ask" }, { status: 400 });

    const status = Date.parse(opensAt) <= now.getTime() ? "open" : "scheduled";
    await r.db.collection(COL).updateOne({ surveyId: s.surveyId }, { $set: { opensAt, closesAt, status, publishedAt: now.toISOString(), updatedAt: now.toISOString() } });
    const sent = status === "open" ? await processDueSurveys(r.db, now).catch(() => null) : null;
    return NextResponse.json({ success: true, status, invited: invites.total, capped: invites.capped, emailed: sent?.emailed ?? 0 });
  } catch (e) {
    console.error("survey publish error:", e);
    return NextResponse.json({ error: "Failed to publish" }, { status: 500 });
  }
}
