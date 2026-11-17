/**
 * GET /api/admin/club-health[?clubId=]
 * A club's data-quality report: what's missing or wrong on member records, teams and incident reports.
 * Needs read access to Reports (matrix) or a club-running login role.
 */

import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";
import { memberBelongsToClubFilter } from "@/lib/rosters/memberClubQuery";
import { canViewReports, reportClub } from "@/lib/auth/reportsGate";
import { assessClub } from "@/lib/health/clubHealth";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const db = await getDatabase();

    if (!(await canViewReports(db, session))) return NextResponse.json({ error: "You don't have access to this area" }, { status: 403 });

    const club = await reportClub(session, new URL(request.url).searchParams.get("clubId"));
    if ("error" in club) return NextResponse.json({ error: club.error }, { status: club.status });
    const clubId = club.clubId;

    const [members, teams, openIncidents] = await Promise.all([
      db.collection("members").find(memberBelongsToClubFilter(clubId), { projection: { memberId: 1, personalInfo: 1, contact: 1, emergencyContacts: 1, membership: 1, status: 1, roles: 1, blueCard: 1, family: 1 } }).limit(5000).toArray(),
      db.collection("teams").find({ clubId, status: { $ne: "archived" } }, { projection: { teamId: 1, name: 1, displayName: 1, roster: 1 } }).limit(500).toArray(),
      db.collection("club_incidents").countDocuments({ clubId, status: { $ne: "closed" } }),
    ]);
    return NextResponse.json(assessClub({ members, teams, openIncidents }));
  } catch (e) {
    console.error("club-health GET error:", e);
    return NextResponse.json({ error: "Failed to run the check" }, { status: 500 });
  }
}
