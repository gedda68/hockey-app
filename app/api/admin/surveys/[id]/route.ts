/**
 * GET    /api/admin/surveys/{id}   the survey with its progress
 * PUT    /api/admin/surveys/{id}   edit it. A draft can change anything; once published only the wording around the
 *                                  questions, the closing date and the reminder can change (answers must stay comparable).
 * DELETE /api/admin/surveys/{id}   remove a draft (published surveys are closed instead)
 */

import { NextRequest, NextResponse } from "next/server";
import { COL, INVITES, RESPONSES, canRunSurveyAt, surveyLevels } from "@/lib/surveys/access";
import { loadManaged } from "@/lib/surveys/manage";
import { cleanSurvey } from "@/lib/surveys/validate";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx): Promise<NextResponse> {
  try {
    const r = await loadManaged((await params).id);
    if (!r.ok) return r.res;
    const [invited, answered] = await Promise.all([
      r.db.collection(INVITES).countDocuments({ surveyId: r.survey.surveyId }),
      r.db.collection(INVITES).countDocuments({ surveyId: r.survey.surveyId, status: "completed" }),
    ]);
    return NextResponse.json({ survey: r.survey, invited, answered });
  } catch (e) {
    console.error("survey GET error:", e);
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: Ctx): Promise<NextResponse> {
  try {
    const r = await loadManaged((await params).id);
    if (!r.ok) return r.res;
    if (r.survey.status === "closed") return NextResponse.json({ error: "A closed survey can't be changed" }, { status: 409 });
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const v = cleanSurvey({ ...r.survey, ...(body ?? {}) });
    if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });
    const now = new Date().toISOString();

    let set: Record<string, unknown>;
    if (r.survey.status === "draft") {
      const levels = await surveyLevels(r.session);
      if (!levels?.includes(v.value.level) || !(await canRunSurveyAt(r.session, v.value.level, v.value.scopeId, r.db))) {
        return NextResponse.json({ error: "You can't run a survey for that audience" }, { status: 403 });
      }
      set = { ...v.value };
    } else {
      const { title, intro, thanks, closesAt, remindDaysBefore } = v.value;
      if (Date.parse(closesAt) <= Date.now()) return NextResponse.json({ error: "Choose a closing date in the future, or close the survey" }, { status: 400 });
      set = { title, intro, thanks, closesAt, remindDaysBefore };
    }
    await r.db.collection(COL).updateOne({ surveyId: r.survey.surveyId }, { $set: { ...set, updatedAt: now } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("survey PUT error:", e);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx): Promise<NextResponse> {
  try {
    const r = await loadManaged((await params).id);
    if (!r.ok) return r.res;
    if (r.survey.status !== "draft") return NextResponse.json({ error: "Only a draft can be deleted. Close it instead." }, { status: 409 });
    await r.db.collection(COL).deleteOne({ surveyId: r.survey.surveyId });
    await Promise.all([r.db.collection(INVITES).deleteMany({ surveyId: r.survey.surveyId }), r.db.collection(RESPONSES).deleteMany({ surveyId: r.survey.surveyId })]);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("survey DELETE error:", e);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
