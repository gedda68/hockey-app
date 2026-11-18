// lib/surveys/manage.ts — loading a survey for someone who manages it (shared by the admin routes).

import { NextResponse } from "next/server";
import type { Db } from "mongodb";
import { getDatabase } from "@/lib/mongodb";
import { getSession, type SessionData } from "@/lib/auth/session";
import { COL, canRunSurveyAt, surveyLevels } from "@/lib/surveys/access";
import type { Survey } from "@/lib/surveys/types";

export type Managed = { ok: true; session: SessionData; db: Db; survey: Survey } | { ok: false; res: NextResponse };

export async function loadManaged(id: string): Promise<Managed> {
  const session = await getSession();
  if (!session) return { ok: false, res: NextResponse.json({ error: "Authentication required" }, { status: 401 }) };
  if (!(await surveyLevels(session))) return { ok: false, res: NextResponse.json({ error: "You can't manage surveys" }, { status: 403 }) };
  const db = await getDatabase();
  const survey = (await db.collection(COL).findOne({ surveyId: id }, { projection: { _id: 0 } })) as Survey | null;
  if (!survey) return { ok: false, res: NextResponse.json({ error: "Survey not found" }, { status: 404 }) };
  if (!(await canRunSurveyAt(session, survey.level, survey.scopeId, db))) return { ok: false, res: NextResponse.json({ error: "That survey isn't yours to manage" }, { status: 403 }) };
  return { ok: true, session, db, survey };
}
