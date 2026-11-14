/**
 * GET /api/member/people-search?q=smi
 * Name look-up for linking related people (parent, child, partner…). Limited on purpose:
 * signed-in members only, at least 3 characters, members of your own club — or of another club when
 * `&clubId=` names one (searching is always scoped to one club, never the whole database) — and only
 * id + name come back, plus phone/email ONLY for members who have not made their contact details private
 * (used to pre-fill an emergency contact). Never dates of birth or addresses.
 */

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";
import { isContactPrivate, shareableContact } from "@/lib/members/privacy";
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
    const ownClub = String(me?.membership?.clubId ?? me?.clubId ?? "");
    const clubRef = (new URL(request.url).searchParams.get("clubId") ?? "").trim().slice(0, 80) || ownClub;
    if (!clubRef) return NextResponse.json({ people: [] });

    const parts = q.split(/\s+/).filter(Boolean).map((p) => new RegExp(esc(p), "i"));
    const people = await db.collection("members")
      .find({
        memberId: { $ne: memberKey },
        $or: [{ clubId: clubRef }, { "membership.clubId": clubRef }],
        $and: parts.map((re) => ({ $or: [{ "personalInfo.firstName": re }, { "personalInfo.lastName": re }, { "personalInfo.displayName": re }] })),
      }, { projection: { memberId: 1, "personalInfo.firstName": 1, "personalInfo.lastName": 1, contact: 1, privacy: 1 } })
      .sort({ "personalInfo.lastName": 1, "personalInfo.firstName": 1 })
      .limit(10)
      .toArray();

    return NextResponse.json({
      people: people.map((m) => ({
        memberId: m.memberId,
        clubId: clubRef,
        name: `${m.personalInfo?.firstName ?? ""} ${m.personalInfo?.lastName ?? ""}`.trim(),
        // Only offered when that member hasn't made their contact details private.
        contact: shareableContact(m),
        contactPrivate: isContactPrivate(m),
      })),
    });
  } catch (e) {
    console.error("people-search error:", e);
    return NextResponse.json({ people: [] });
  }
}
