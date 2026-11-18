/**
 * GET  /api/member/surveys/{id}                      the survey to answer
 * POST /api/member/surveys/{id}  { answers }         submit
 * POST /api/member/surveys/{id}  { decline: true }   "not now": stops the pop-up
 */

import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";
import { resolveSessionMemberId } from "@/lib/auth/sessionMember";
import { COL, INVITES } from "@/lib/surveys/access";
import { declineInvite, publicView, submitResponse, type InviteDoc } from "@/lib/surveys/respond";
import type { Survey } from "@/lib/surveys/types";

async function load(id: string) {
  const session = await getSession();
  if (!session) return { ok: false, res: NextResponse.json({ error: "Authentication required" }, { status: 401 }) } as const;
  const db = await getDatabase();
  const memberId = await resolveSessionMemberId(db, session);
  const invite = memberId ? ((await db.collection(INVITES).findOne({ surveyId: id, memberId }, { projection: { _id: 0 } })) as InviteDoc | null) : null;
  const survey = invite ? ((await db.collection(COL).findOne({ surveyId: id }, { projection: { _id: 0 } })) as Survey | null) : null;
  if (!invite || !survey || survey.status === "draft" || survey.status === "scheduled") return { ok: false, res: NextResponse.json({ error: "Survey not found" }, { status: 404 }) } as const;
  return { ok: true, db, invite, survey } as const;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  try {
    const r = await load((await params).id);
    if (!r.ok) return r.res;
    return NextResponse.json({ survey: publicView(r.survey, r.invite) });
  } catch (e) {
    console.error("member survey GET error:", e);
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  try {
    const r = await load((await params).id);
    if (!r.ok) return r.res;
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    if (body.decline === true) {
      await declineInvite(r.db, r.invite);
      return NextResponse.json({ success: true });
    }
    const out = await submitResponse(r.db, r.survey, r.invite, body.answers, "app");
    if (!out.ok) return NextResponse.json({ error: out.error }, { status: out.status });
    return NextResponse.json({ success: true, thanks: r.survey.thanks || "Thank you for your answers." });
  } catch (e) {
    console.error("member survey POST error:", e);
    return NextResponse.json({ error: "Failed to send your answers" }, { status: 500 });
  }
}
