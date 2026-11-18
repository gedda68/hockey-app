/**
 * GET  /api/member/match-votes   → votes I can cast, recent results for my teams, and each team's season leaderboard
 * POST /api/member/match-votes   { roundId, ballot: { first, second?, third? } }
 */
import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";
import { resolveSessionMemberId } from "@/lib/auth/sessionMember";
import { castVote, myVotes, seasonBoard } from "@/lib/awards/service";
import { todayInZone } from "@/lib/member/availability";

export async function GET(): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const db = await getDatabase();
    const me = await resolveSessionMemberId(db, session);
    if (!me) return NextResponse.json({ open: [], done: [], boards: [] });
    const { open, done } = await myVotes(db, me);
    const year = String(todayInZone()).slice(0, 4);
    const teams = new Map<string, string>();
    for (const r of [...open, ...(await db.collection("match_vote_rounds").find({ voterIds: me }, { projection: { teamId: 1, teamName: 1 } }).limit(40).toArray())] as { teamId: string; teamName: string }[]) teams.set(String(r.teamId), String(r.teamName));
    const boards = await Promise.all([...teams].slice(0, 6).map(async ([teamId, teamName]) => ({ teamId, teamName, rows: await seasonBoard(db, { teamId, year }, 5) })));
    return NextResponse.json({ me, open, done, boards: boards.filter((b) => b.rows.length), year });
  } catch (e) {
    console.error("member match-votes error:", e);
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const db = await getDatabase();
    const me = await resolveSessionMemberId(db, session);
    if (!me) return NextResponse.json({ error: "No member profile on this account" }, { status: 400 });
    const body = (await request.json().catch(() => ({}))) as { roundId?: string; ballot?: unknown };
    if (!body.roundId) return NextResponse.json({ error: "roundId is required" }, { status: 400 });
    const r = await castVote(db, String(body.roundId), me, body.ballot);
    return r.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: r.error }, { status: r.status });
  } catch (e) {
    console.error("cast vote error:", e);
    return NextResponse.json({ error: "Failed to save your vote" }, { status: 500 });
  }
}
