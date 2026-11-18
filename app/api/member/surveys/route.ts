/**
 * GET /api/member/surveys
 * The surveys I've been asked to answer (open ones I haven't done, plus ones I've done), for My surveys and the pop-up.
 */

import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";
import { resolveSessionMemberId } from "@/lib/auth/sessionMember";
import { COL, INVITES } from "@/lib/surveys/access";

export async function GET(): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const db = await getDatabase();
    const memberId = await resolveSessionMemberId(db, session);
    if (!memberId) return NextResponse.json({ surveys: [] });
    const invites = await db.collection(INVITES).find({ memberId }, { projection: { _id: 0, token: 0 } }).sort({ createdAt: -1 }).limit(100).toArray();
    const surveys = invites.length ? await db.collection(COL).find({ surveyId: { $in: invites.map((i) => String(i.surveyId)) }, status: { $in: ["open", "closed"] } }, { projection: { _id: 0, surveyId: 1, title: 1, intro: 1, closesAt: 1, opensAt: 1, status: 1, anonymous: 1, delivery: 1, purpose: 1, subject: 1 } }).toArray() : [];
    const byId = new Map(surveys.map((s) => [String(s.surveyId), s]));
    const now = Date.now();
    const rows = invites.flatMap((i) => {
      const s = byId.get(String(i.surveyId));
      if (!s) return [];
      const open = s.status === "open" && Date.parse(String(s.closesAt)) > now && Date.parse(String(s.opensAt)) <= now;
      // Closed surveys I didn't answer aren't worth listing.
      if (!open && i.status !== "completed") return [];
      return [{
        surveyId: s.surveyId, title: s.title, intro: s.intro, closesAt: s.closesAt, anonymous: !!s.anonymous, purpose: s.purpose, subject: s.subject,
        popup: !!s.delivery?.popup, onBehalfOf: i.onBehalfOf?.name ?? null, state: i.status === "completed" ? "completed" : i.status === "declined" ? "declined" : "pending", open,
      }];
    });
    return NextResponse.json({ surveys: rows });
  } catch (e) {
    console.error("member surveys GET error:", e);
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }
}
