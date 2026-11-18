/**
 * GET  /api/admin/competition-votes                              → season competitions I run
 * GET  /api/admin/competition-votes?seasonCompetitionId=         → the competition's vote leaderboard (team votes + umpires' and officials' votes) and settings
 * POST /api/admin/competition-votes { seasonCompetitionId, action: "record", memberId }   → record the player of the season on the official awards list
 *                                   { seasonCompetitionId, action: "decide", roundId, winnerId }   → choose the player of the match when the officials tied
 *                                   { seasonCompetitionId, action: "settings", officials: { enabled?, closeDays? } }
 */
import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";
import type { Permission } from "@/lib/types/roles";
import { requireAnyPermission, requireResourceAccess } from "@/lib/auth/middleware";
import { ROUNDS, competitionBoard, loadOfficialSettings, officialTies, resolveTie, recordSeasonPlayer, saveOfficialSettings } from "@/lib/awards/service";

const PERMS: Permission[] = ["competitions.manage", "competitions.fixtures", "results.manage"];

async function competitionFor(request: NextRequest, db: Awaited<ReturnType<typeof getDatabase>>, id: string) {
  const sc: any = await db.collection("season_competitions").findOne({ seasonCompetitionId: id }, { projection: { seasonCompetitionId: 1, owningAssociationId: 1, displayName: 1, competitionName: 1, season: 1 } });
  if (!sc) return { ok: false as const, res: NextResponse.json({ error: "Competition not found" }, { status: 404 }) } as const;
  const scope = await requireResourceAccess(request, "association", String(sc.owningAssociationId));
  if (scope.response) return { ok: false as const, res: scope.response } as const;
  return { ok: true as const, sc } as const;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { response } = await requireAnyPermission(request, PERMS);
    if (response) return response;
    const session = await getSession();
    const db = await getDatabase();
    const id = request.nextUrl.searchParams.get("seasonCompetitionId");
    if (!id) {
      const filter = session?.role === "super-admin" ? {} : { owningAssociationId: String(session?.associationId ?? "") };
      const rows: any[] = await db.collection("season_competitions").find(filter, { projection: { seasonCompetitionId: 1, displayName: 1, competitionName: 1, season: 1, status: 1 } }).sort({ season: -1 }).limit(100).toArray();
      return NextResponse.json({ competitions: rows.map((r) => ({ seasonCompetitionId: r.seasonCompetitionId, name: String(r.displayName || r.competitionName || r.seasonCompetitionId), season: r.season ?? "", status: r.status ?? "" })) });
    }
    const c = await competitionFor(request, db, id);
    if (!c.ok) return c.res;
    const [board, settings, open, ties] = await Promise.all([
      competitionBoard(db, id, 30),
      loadOfficialSettings(db, String(c.sc.owningAssociationId)),
      db.collection(ROUNDS).find({ seasonCompetitionId: id, status: "open" }, { projection: { roundId: 1 } }).limit(500).toArray(),
      officialTies(db, id),
    ]);
    const recorded: any[] = await db.collection("competition_awards").find({ context: "league", seasonCompetitionId: id, awardType: "player_of_competition" }, { projection: { memberId: 1 } }).toArray();
    return NextResponse.json({ ...board, openVotes: open.length, ties, settings, recorded: recorded.map((r) => String(r.memberId)) });
  } catch (e) {
    console.error("competition votes error:", e);
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { response } = await requireAnyPermission(request, PERMS);
    if (response) return response;
    const session = await getSession();
    const db = await getDatabase();
    const b = (await request.json().catch(() => ({}))) as Record<string, any>;
    const c = await competitionFor(request, db, String(b.seasonCompetitionId ?? ""));
    if (!c.ok) return c.res;
    if (b.action === "settings") return NextResponse.json({ settings: await saveOfficialSettings(db, String(c.sc.owningAssociationId), b) });
    if (b.action === "decide") {
      const round: any = await db.collection(ROUNDS).findOne({ roundId: String(b.roundId ?? ""), seasonCompetitionId: String(b.seasonCompetitionId), kind: "officials" }, { projection: { roundId: 1 } });
      if (!round) return NextResponse.json({ error: "Not found" }, { status: 404 });
      const r = await resolveTie(db, String(b.roundId), String(b.winnerId ?? ""));
      return r.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: r.error }, { status: r.status });
    }
    if (b.action === "record") {
      const r = await recordSeasonPlayer(db, String(b.seasonCompetitionId), String(b.memberId ?? ""), String(session?.memberId ?? session?.userId ?? "votes"));
      return r.ok ? NextResponse.json({ ok: true }, { status: 201 }) : NextResponse.json({ error: r.error }, { status: r.status });
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    console.error("competition votes post error:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
