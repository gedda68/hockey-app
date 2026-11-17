/**
 * GET /api/admin/club-health[?clubId=]
 * A club's data-quality report: what's missing or wrong on member records, teams and incident reports.
 * Needs read access to Reports (matrix) or a club-running login role.
 */

import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";
import { userCanAccessClubResource } from "@/lib/auth/resourceAccessDb";
import { accessForSession } from "@/lib/access/memberAccess";
import { decideArea } from "@/lib/access/areaAccess";
import { memberBelongsToClubFilter } from "@/lib/rosters/memberClubQuery";
import { assessClub } from "@/lib/health/clubHealth";

const LEGACY_ROLES = new Set(["super-admin", "association-admin", "club-admin", "club-committee", "registrar"]);

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const db = await getDatabase();

    const access = session.memberId ? await accessForSession(db, session).catch(() => null) : null;
    const d = decideArea(access, session.role, "reports", "R");
    if (d.enforced ? !d.allowed : !LEGACY_ROLES.has(String(session.role))) return NextResponse.json({ error: "You don't have access to this area" }, { status: 403 });

    const asked = new URL(request.url).searchParams.get("clubId")?.trim();
    const clubId = asked || session.clubId || "";
    if (!clubId) return NextResponse.json({ error: "Choose a club first" }, { status: 400 });
    if (asked && asked !== session.clubId && !(await userCanAccessClubResource(session, asked))) return NextResponse.json({ error: "You can't use that club" }, { status: 403 });

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
