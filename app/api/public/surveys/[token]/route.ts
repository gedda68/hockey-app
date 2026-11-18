/**
 * GET  /api/public/surveys/{token}             the survey behind a personal email link (no sign-in needed)
 * POST /api/public/surveys/{token} { answers } submit it
 * The token is the person's private invitation: it only opens their own invitation, once.
 */

import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { COL, INVITES } from "@/lib/surveys/access";
import { publicView, submitResponse, type InviteDoc } from "@/lib/surveys/respond";
import type { Survey } from "@/lib/surveys/types";

async function load(token: string) {
  if (!/^[A-Za-z0-9_-]{20,80}$/.test(token)) return null;
  const db = await getDatabase();
  const invite = (await db.collection(INVITES).findOne({ token }, { projection: { _id: 0 } })) as InviteDoc | null;
  if (!invite) return null;
  const survey = (await db.collection(COL).findOne({ surveyId: invite.surveyId }, { projection: { _id: 0 } })) as Survey | null;
  if (!survey || survey.status === "draft" || survey.status === "scheduled") return null;
  return { db, invite, survey };
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }): Promise<NextResponse> {
  try {
    const r = await load((await params).token);
    if (!r) return NextResponse.json({ error: "This survey link isn't valid" }, { status: 404 });
    return NextResponse.json({ survey: publicView(r.survey, r.invite) });
  } catch (e) {
    console.error("public survey GET error:", e);
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }): Promise<NextResponse> {
  try {
    const r = await load((await params).token);
    if (!r) return NextResponse.json({ error: "This survey link isn't valid" }, { status: 404 });
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const out = await submitResponse(r.db, r.survey, r.invite, body.answers, "email");
    if (!out.ok) return NextResponse.json({ error: out.error }, { status: out.status });
    return NextResponse.json({ success: true, thanks: r.survey.thanks || "Thank you for your answers." });
  } catch (e) {
    console.error("public survey POST error:", e);
    return NextResponse.json({ error: "Failed to send your answers" }, { status: 500 });
  }
}
