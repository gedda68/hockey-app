/**
 * GET  /api/admin/match-votes   → player-of-the-match votes for the teams I coach, manage or run, with progress and results
 * POST /api/admin/match-votes   { roundId, action: "close" } | { roundId, action: "decide", winnerId }   (settles a tie)
 */
import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";
import { canManageTeam, manageableTeams } from "@/lib/rsvp/access";
import { ROUNDS, closeRound, namesFor, resolveTie, seasonBoard } from "@/lib/awards/service";
import { todayInZone } from "@/lib/member/availability";

export async function GET(): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const db = await getDatabase();
    const teams = await manageableTeams(session, db);
    if (!teams.length) return NextResponse.json({ forbidden: true, rounds: [], boards: [] }, { status: 403 });
    const rounds: any[] = await db.collection(ROUNDS).find({ teamId: { $in: teams.map((t) => t.teamId) } }, { projection: { _id: 0, candidates: 0 } }).sort({ startsAt: -1 }).limit(60).toArray();
    const names = await namesFor(db, rounds.flatMap((r) => [...(r.winnerId ? [r.winnerId] : []), ...(r.tally ?? []).map((t: any) => t.memberId), ...(r.result?.memberIds ?? [])]));
    const nm = (id: string) => names.get(String(id)) ?? "Player";
    const year = String(todayInZone()).slice(0, 4);
    const boards = await Promise.all(teams.slice(0, 12).map(async (t) => ({ teamId: t.teamId, teamName: t.name, rows: await seasonBoard(db, { teamId: t.teamId, year }, 10) })));
    return NextResponse.json({
      year,
      rounds: rounds.map((r) => ({
        roundId: r.roundId, teamId: r.teamId, teamName: r.teamName, opponentName: r.opponentName, startsAt: r.startsAt, closesAt: r.closesAt, status: r.status,
        voters: (r.voterIds ?? []).length, voted: r.votedCount ?? 0, winnerId: r.winnerId ?? null, winnerName: r.winnerId ? nm(r.winnerId) : null,
        tied: r.result?.kind === "tied" && !r.winnerId ? (r.result.memberIds as string[]).map((id) => ({ memberId: id, name: nm(id) })) : [],
        tally: r.status === "closed" ? (r.tally ?? []).slice(0, 5).map((t: any) => ({ name: nm(t.memberId), points: t.points, firsts: t.firsts })) : [],
      })),
      boards: boards.filter((b) => b.rows.length),
    });
  } catch (e) {
    console.error("admin match-votes error:", e);
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const db = await getDatabase();
    const b = (await request.json().catch(() => ({}))) as { roundId?: string; action?: string; winnerId?: string };
    const round: any = b.roundId ? await db.collection(ROUNDS).findOne({ roundId: String(b.roundId) }, { projection: { teamId: 1 } }) : null;
    if (!round) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!(await canManageTeam(session, String(round.teamId), db))) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
    if (b.action === "close") { const r = await closeRound(db, String(b.roundId)); return NextResponse.json({ ok: true, ...r }); }
    if (b.action === "decide") { const r = await resolveTie(db, String(b.roundId), String(b.winnerId ?? "")); return r.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: r.error }, { status: r.status }); }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    console.error("admin match-votes post error:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
