/**
 * GET /api/admin/surveys/{id}/results            counts, averages and written answers
 * GET /api/admin/surveys/{id}/results?format=csv  one row per response (no names on an anonymous survey)
 * An anonymous survey shows nothing but the response count until enough people have answered.
 */

import { NextRequest, NextResponse } from "next/server";
import { INVITES, RESPONSES } from "@/lib/surveys/access";
import { loadManaged } from "@/lib/surveys/manage";
import { aggregate, toCsv, type ResponseLike } from "@/lib/surveys/aggregate";
import { MIN_ANONYMOUS_RESPONSES } from "@/lib/surveys/types";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  try {
    const r = await loadManaged((await params).id);
    if (!r.ok) return r.res;
    const s = r.survey;
    const [rows, invited] = await Promise.all([
      r.db.collection(RESPONSES).find({ surveyId: s.surveyId }, { projection: { _id: 0 } }).limit(50000).toArray(),
      r.db.collection(INVITES).countDocuments({ surveyId: s.surveyId }),
    ]);
    const responses: ResponseLike[] = rows.map((x: any) => ({ answers: x.answers ?? [], memberId: x.memberId, memberName: x.memberName, submittedAt: x.submittedAt }));
    const results = aggregate(s.questions, responses, { anonymous: s.anonymous, invited });

    if (request.nextUrl.searchParams.get("format") === "csv") {
      if (s.anonymous && responses.length < MIN_ANONYMOUS_RESPONSES) return NextResponse.json({ error: `An anonymous survey can be downloaded once ${MIN_ANONYMOUS_RESPONSES} people have answered` }, { status: 409 });
      const name = s.title.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "survey";
      return new NextResponse(toCsv(s.questions, responses, s.anonymous), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${name}-responses.csv"` } });
    }
    return NextResponse.json({ survey: { surveyId: s.surveyId, title: s.title, status: s.status, anonymous: s.anonymous, closesAt: s.closesAt, subject: s.subject, purpose: s.purpose }, results });
  } catch (e) {
    console.error("survey results error:", e);
    return NextResponse.json({ error: "Failed to load results" }, { status: 500 });
  }
}
