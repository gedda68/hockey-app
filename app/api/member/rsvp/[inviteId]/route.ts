/** POST /api/member/rsvp/<inviteId> { answer: "in" | "maybe" | "out", note? } → answer for myself, or for my child as their parent. */

import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";
import { resolveSessionMemberId } from "@/lib/auth/sessionMember";
import { answerInvite } from "@/lib/rsvp/respond";

export async function POST(request: NextRequest, { params }: { params: Promise<{ inviteId: string }> }): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const db = await getDatabase();
    const me = await resolveSessionMemberId(db, session);
    if (!me) return NextResponse.json({ error: "No member profile on this account" }, { status: 400 });
    const body = await request.json().catch(() => ({}));
    const r = await answerInvite(db, { inviteId: (await params).inviteId, notify: me }, body, me);
    return r.ok ? NextResponse.json({ ok: true, answer: r.answer }) : NextResponse.json({ error: r.error }, { status: r.status });
  } catch (e) {
    console.error("member rsvp answer error:", e);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}
