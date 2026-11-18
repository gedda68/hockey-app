/**
 * Surveys for members, run by teams, clubs, associations or the national body.
 *   GET  → the surveys this person may manage, with how many people were asked and have answered
 *   POST → a new survey, saved as a draft (publish it from its own page)
 * Who may run one: same as announcements (Communications at edit level, or login role).
 * Collections: surveys, survey_invites, survey_responses.
 */

import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";
import { resolveSessionMemberId } from "@/lib/auth/sessionMember";
import { COL, INVITES, canRunSurveyAt, manageFilter, surveyLevels } from "@/lib/surveys/access";
import { cleanSurvey } from "@/lib/surveys/validate";
import { newSurveyId } from "@/lib/surveys/process";

export async function GET(): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const levels = await surveyLevels(session);
    if (!levels) return NextResponse.json({ error: "You can't manage surveys" }, { status: 403 });
    const db = await getDatabase();
    const filter = await manageFilter(session, db);
    const surveys = filter ? await db.collection(COL).find(filter, { projection: { _id: 0, questions: 0 } }).sort({ createdAt: -1 }).limit(200).toArray() : [];
    const ids = surveys.map((s) => String(s.surveyId));
    const done = ids.length ? await db.collection(INVITES).aggregate([{ $match: { surveyId: { $in: ids }, status: "completed" } }, { $group: { _id: "$surveyId", n: { $sum: 1 } } }]).toArray() : [];
    const answered = new Map(done.map((d) => [String(d._id), Number(d.n)]));
    return NextResponse.json({ surveys: surveys.map((s) => ({ ...s, answered: answered.get(String(s.surveyId)) ?? 0 })), levels });
  } catch (e) {
    console.error("surveys GET error:", e);
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const levels = await surveyLevels(session);
    if (!levels) return NextResponse.json({ error: "You can't run surveys" }, { status: 403 });
    const v = cleanSurvey(await request.json().catch(() => null));
    if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });
    const db = await getDatabase();
    if (!levels.includes(v.value.level) || !(await canRunSurveyAt(session, v.value.level, v.value.scopeId, db))) {
      return NextResponse.json({ error: "You can't run a survey for that audience" }, { status: 403 });
    }
    const now = new Date().toISOString();
    const doc = {
      surveyId: newSurveyId(),
      ...v.value,
      status: "draft",
      createdBy: (session.memberId ? await resolveSessionMemberId(db, session) : "") || session.userId,
      createdByName: session.name,
      createdAt: now,
      updatedAt: now,
    };
    await db.collection(COL).insertOne({ ...doc });
    return NextResponse.json({ success: true, survey: doc }, { status: 201 });
  } catch (e) {
    console.error("surveys POST error:", e);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}
