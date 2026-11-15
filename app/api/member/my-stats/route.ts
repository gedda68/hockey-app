/**
 * GET /api/member/my-stats
 * The signed-in member's own playing numbers (games, goals, per team…). Own record only.
 */

import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";
import { resolveSessionMemberId } from "@/lib/auth/sessionMember";
import { computePlayingStats } from "@/lib/members/playingStats";
import { hasPlayerHistory } from "@/lib/members/playerStats";

export async function GET() {
  try {
    const session = await getSession();
    if (!session?.memberId) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

    const db = (await clientPromise).db("hockey-app");
    const memberKey = await resolveSessionMemberId(db, session);
    const member = await db.collection("members").findOne(
      { memberId: memberKey },
      { projection: { roles: 1, membership: 1, teams: 1, playerInfo: 1 } },
    );
    if (!member) return NextResponse.json({ error: "Member record not found" }, { status: 404 });

    const lineups = await db.collection("fixture_lineups")
      .find({ "players.memberId": memberKey }, { projection: { fixtureId: 1, teamId: 1, players: 1 } })
      .limit(3000)
      .toArray();
    const fixtures = lineups.length
      ? await db.collection("league_fixtures")
          .find({ fixtureId: { $in: lineups.map((l) => String(l.fixtureId)) } },
            { projection: { fixtureId: 1, scheduledStart: 1, status: 1, matchEvents: 1, homeTeamId: 1, awayTeamId: 1, result: 1 } })
          .toArray()
      : [];
    const teamIds = [...new Set(lineups.map((l) => String(l.teamId)).filter(Boolean))];
    const teamDocs = teamIds.length
      ? await db.collection("teams").find({ teamId: { $in: teamIds } }, { projection: { teamId: 1, name: 1, displayName: 1 } }).toArray()
      : [];
    const teamNames = new Map(teamDocs.map((t) => [String(t.teamId), String(t.displayName ?? t.name ?? t.teamId)]));

    const stats = computePlayingStats(memberKey, lineups, fixtures, teamNames, new Date(), member.playerInfo?.appearances, member.playerInfo?.goals);
    return NextResponse.json({ ...stats, isPlayer: hasPlayerHistory(member, { gamesTotal: stats.allTime.games }) });
  } catch (e) {
    console.error("my-stats error:", e);
    return NextResponse.json({ error: "Failed to load stats" }, { status: 500 });
  }
}
