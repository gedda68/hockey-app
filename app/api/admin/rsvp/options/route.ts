/** GET /api/admin/rsvp/options: the teams this person can ask, with each team's upcoming fixtures to pick from. */

import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";
import { manageableTeams } from "@/lib/rsvp/access";
import { dayInZone } from "@/lib/member/availability";

export async function GET(): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const db = await getDatabase();
    const teams = await manageableTeams(session, db);
    if (!teams.length) return NextResponse.json({ error: "You aren't a coach or manager of a team" }, { status: 403 });
    const ids = teams.map((t) => t.teamId);
    const now = new Date();
    const fx = await db.collection("league_fixtures").find(
      { $or: [{ homeTeamId: { $in: ids } }, { awayTeamId: { $in: ids } }], scheduledStart: { $gte: now.toISOString(), $lte: new Date(now.getTime() + 60 * 86400000).toISOString() }, status: { $nin: ["cancelled", "completed"] } },
      { projection: { fixtureId: 1, homeTeamId: 1, awayTeamId: 1, scheduledStart: 1, venueName: 1, round: 1 } },
    ).sort({ scheduledStart: 1 }).limit(300).toArray();
    const allIds = [...new Set(fx.flatMap((f) => [f.homeTeamId, f.awayTeamId]).filter(Boolean).map(String))];
    const named = await db.collection("teams").find({ teamId: { $in: allIds } }, { projection: { teamId: 1, name: 1, displayName: 1 } }).toArray();
    const nm = new Map(named.map((t) => [String(t.teamId), String(t.displayName || t.name || "")]));
    const mine = new Set(ids);
    const fixtures = fx.flatMap((f) => {
      const home = String(f.homeTeamId ?? ""), away = String(f.awayTeamId ?? "");
      return [home, away].filter((t) => mine.has(t)).map((teamId) => {
        const opp = teamId === home ? away : home;
        return { fixtureId: String(f.fixtureId), teamId, opponent: nm.get(opp) ?? "", round: f.round ?? null, startsAt: String(f.scheduledStart), matchDate: dayInZone(String(f.scheduledStart)), venue: String(f.venueName ?? "") };
      });
    });
    return NextResponse.json({ teams, fixtures, today: dayInZone(now) });
  } catch (e) {
    console.error("rsvp options error:", e);
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }
}
