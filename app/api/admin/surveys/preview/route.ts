/**
 * POST /api/admin/surveys/preview  { level, scopeId?, includeBelow?, audience? }
 * How many people a survey would go to, and how many of them can be emailed. Same permissions as running it.
 */

import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";
import { canRunSurveyAt, surveyLevels } from "@/lib/surveys/access";
import { cleanAudience } from "@/lib/surveys/validate";
import { resolveRespondents } from "@/lib/surveys/audience";
import { LEVELS, type SurveyLevel } from "@/lib/surveys/types";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const levels = await surveyLevels(session);
    if (!levels) return NextResponse.json({ error: "You can't run surveys" }, { status: 403 });
    const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const level = LEVELS.find((l) => l === b.level) as SurveyLevel | undefined;
    const scopeId = level === "global" ? "" : String(b.scopeId ?? "").trim();
    if (!level || (level !== "global" && !scopeId)) return NextResponse.json({ error: "Choose who it's for" }, { status: 400 });
    const db = await getDatabase();
    if (!levels.includes(level) || !(await canRunSurveyAt(session, level, scopeId, db))) return NextResponse.json({ error: "You can't run a survey for that audience" }, { status: 403 });
    const { respondents, capped } = await resolveRespondents(db, { level, scopeId, includeBelow: level === "association" && b.includeBelow !== false, audience: cleanAudience(b.audience) });
    return NextResponse.json({
      people: respondents.length,
      emailable: respondents.filter((r) => r.email && r.emailOk).length,
      parents: respondents.filter((r) => r.onBehalfOf).length,
      capped,
    });
  } catch (e) {
    console.error("survey preview error:", e);
    return NextResponse.json({ error: "Couldn't work that out" }, { status: 500 });
  }
}
