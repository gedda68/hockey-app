/**
 * GET /api/member/nomination-options?season=2026
 * The signed-in member's view of every open representative team (age group) with, per position,
 * whether they may nominate and why not. Rules live in lib/nominations/positions.ts.
 */

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";
import { resolveSessionMemberId } from "@/lib/auth/sessionMember";
import { loadOpenOpportunities } from "@/lib/nominations/openOpportunities";
import { evaluatePositions, nominationPosition, ageInSeason } from "@/lib/nominations/positions";
import { isPlayerRole } from "@/lib/members/blueCard";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    if (!session.memberId) return NextResponse.json({ error: "No member record is linked to this account" }, { status: 404 });

    const season = new URL(request.url).searchParams.get("season") ?? String(new Date().getFullYear());
    const db = (await clientPromise).db("hockey-app");
    const memberKey = await resolveSessionMemberId(db, session);
    const member = await db.collection("members").findOne({ memberId: memberKey });
    if (!member) return NextResponse.json({ error: "Member record not found" }, { status: 404 });

    const roles: string[] = [...(member.roles ?? []), ...(member.membership?.roles ?? [])].map(String);
    const facts = { dateOfBirth: member.personalInfo?.dateOfBirth, roles };

    const noms = await db.collection("rep_nominations").find({ season, memberId: memberKey, status: { $ne: "withdrawn" } }).toArray();
    const existing = noms.map((n) => ({ ageGroup: String(n.ageGroup), position: nominationPosition(n as { nominationType?: string; role?: string }) }));

    const opps = await loadOpenOpportunities(db, season);
    const options = opps.map((o) => ({
      ageGroup: o.ageGroup,
      season: o.season,
      tournamentTitle: o.tournamentTitle,
      tournamentGender: o.tournamentGender,
      tournamentLocation: o.tournamentLocation,
      tournamentStartDate: o.tournamentStartDate,
      tournamentEndDate: o.tournamentEndDate,
      daysRemaining: o.daysRemaining,
      positions: evaluatePositions(facts, o.ageGroup, parseInt(o.season, 10), existing),
    }));

    return NextResponse.json({
      season,
      isPlayer: roles.some(isPlayerRole),
      ageInSeason: ageInSeason(facts.dateOfBirth, parseInt(season, 10)),
      options,
    });
  } catch (e) {
    console.error("nomination-options error:", e);
    return NextResponse.json({ error: "Failed to load nomination options" }, { status: 500 });
  }
}
