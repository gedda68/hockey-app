/**
 * GET /api/member/people-search?q=smi
 * Name look-up for linking related people (parent, child, partner…). Limited on purpose:
 * signed-in members only, at least 3 characters, only members of the SAME club, and only
 * id + name come back (no contact details, dates of birth or addresses).
 */

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";
import { resolveSessionMemberId } from "@/lib/auth/sessionMember";

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.memberId) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

    const q = (new URL(request.url).searchParams.get("q") ?? "").trim().slice(0, 60);
    if (q.length < 3) return NextResponse.json({ people: [] });

    const db = (await clientPromise).db("hockey-app");
    const memberKey = await resolveSessionMemberId(db, session);
    const me = await db.collection("members").findOne({ memberId: memberKey }, { projection: { clubId: 1, membership: 1 } });
    const clubRef = String(me?.membership?.clubId ?? me?.clubId ?? "");
    if (!clubRef) return NextResponse.json({ people: [] });

    const parts = q.split(/\s+/).filter(Boolean).map((p) => new RegExp(esc(p), "i"));
    const people = await db.collection("members")
      .find({
        memberId: { $ne: memberKey },
        $or: [{ clubId: clubRef }, { "membership.clubId": clubRef }],
        $and: parts.map((re) => ({ $or: [{ "personalInfo.firstName": re }, { "personalInfo.lastName": re }, { "personalInfo.displayName": re }] })),
      }, { projection: { memberId: 1, "personalInfo.firstName": 1, "personalInfo.lastName": 1 } })
      .sort({ "personalInfo.lastName": 1, "personalInfo.firstName": 1 })
      .limit(10)
      .toArray();

    return NextResponse.json({
      people: people.map((m) => ({ memberId: m.memberId, name: `${m.personalInfo?.firstName ?? ""} ${m.personalInfo?.lastName ?? ""}`.trim() })),
    });
  } catch (e) {
    console.error("people-search error:", e);
    return NextResponse.json({ people: [] });
  }
}
