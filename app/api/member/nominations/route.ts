/**
 * POST /api/member/nominations  { season, ageGroup, position, notes? }
 * Self-nomination for a staff position (head coach, assistant coach, manager, selector).
 * Player nominations keep their own flow (fees, medical verification) and are refused here.
 * The same eligibility rules as the options endpoint are re-checked on the server.
 */

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";
import { resolveSessionMemberId } from "@/lib/auth/sessionMember";
import { loadOpenOpportunities } from "@/lib/nominations/openOpportunities";
import { evaluatePositions, nominationPosition, STAFF_POSITIONS, type Position } from "@/lib/nominations/positions";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    if (!session.memberId) return NextResponse.json({ error: "No member record is linked to this account" }, { status: 404 });

    const body = (await request.json().catch(() => ({}))) as { season?: string; ageGroup?: string; position?: string; notes?: string };
    const season = String(body.season ?? "").trim();
    const ageGroup = String(body.ageGroup ?? "").trim();
    const position = String(body.position ?? "") as Position;
    if (!season || !ageGroup) return NextResponse.json({ error: "season and ageGroup are required" }, { status: 400 });
    if (!STAFF_POSITIONS.includes(position)) {
      return NextResponse.json({ error: "Choose a staff position. Player nominations use the player nomination flow." }, { status: 400 });
    }

    const db = (await clientPromise).db("hockey-app");
    const memberKey = await resolveSessionMemberId(db, session);
    const member = await db.collection("members").findOne({ memberId: memberKey });
    if (!member) return NextResponse.json({ error: "Member record not found" }, { status: 404 });

    const opps = await loadOpenOpportunities(db, season);
    if (!opps.some((o) => o.ageGroup === ageGroup)) {
      return NextResponse.json({ error: `Nominations for ${ageGroup} are not currently open` }, { status: 409 });
    }

    const roles: string[] = [...(member.roles ?? []), ...(member.membership?.roles ?? [])].map(String);
    const noms = await db.collection("rep_nominations").find({ season, memberId: memberKey, status: { $ne: "withdrawn" } }).toArray();
    const existing = noms.map((n) => ({ ageGroup: String(n.ageGroup), position: nominationPosition(n as { nominationType?: string; role?: string }) }));
    const verdict = evaluatePositions({ dateOfBirth: member.personalInfo?.dateOfBirth, roles }, ageGroup, parseInt(season, 10), existing)
      .find((v) => v.position === position);
    if (!verdict?.allowed) {
      return NextResponse.json({ error: verdict?.reason ?? "You can't nominate for this position" }, { status: 403 });
    }

    const clubRef = String(member.membership?.clubId ?? member.clubId ?? "");
    const club = clubRef
      ? await db.collection("clubs").findOne({ $or: [{ id: clubRef }, { clubId: clubRef }, { slug: clubRef }] })
      : null;
    const dob = String(member.personalInfo?.dateOfBirth ?? "");
    const now = new Date().toISOString();
    const nomination = {
      nominationId: `nom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      season,
      ageGroup,
      clubId: club?.id ?? club?.clubId ?? clubRef,
      clubName: club?.name ?? "",
      memberId: memberKey,
      memberName: `${member.personalInfo?.firstName ?? ""} ${member.personalInfo?.lastName ?? ""}`.trim(),
      dateOfBirth: dob,
      ageAtSeason: dob ? parseInt(season, 10) - new Date(dob).getFullYear() : null,
      nominatedBy: memberKey,
      nominatedAt: now,
      status: "pending",
      notes: String(body.notes ?? "").slice(0, 1000),
      updatedAt: now,
      nominationType: "official",
      role: position,
    };
    await db.collection("rep_nominations").insertOne(nomination);
    return NextResponse.json({ success: true, nomination }, { status: 201 });
  } catch (e) {
    console.error("member nominations POST error:", e);
    return NextResponse.json({ error: "Failed to submit nomination" }, { status: 500 });
  }
}
