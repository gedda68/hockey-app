/**
 * GET /api/member/stats/coach-analytics
 *
 * Season rollups for the logged-in staff user (coachUserId) or member coach (coachMemberId).
 */

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getDatabase } from "@/lib/mongodb";
import {
  listCoachAnalyticsForMemberCoach,
  listCoachAnalyticsForStaff,
  summarizeCoachAnalytics,
} from "@/lib/stats/memberStatsService";
import type { CoachTeamAnalyticsRow } from "@/types/memberStats";

const COACH_LIKE = new Set([
  "coach",
  "manager",
  "assoc-coach",
  "team-selector",
]);

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = session.role || "";
  const scoped =
    session.scopedRoles?.some((r) => COACH_LIKE.has(r.role)) ?? false;
  if (!COACH_LIKE.has(role) && !scoped) {
    return NextResponse.json(
      { error: "Coach or team-staff role required" },
      { status: 403 },
    );
  }

  const db = await getDatabase();
  const staffRows = session.userId
    ? await listCoachAnalyticsForStaff(db, session.userId)
    : [];
  const memberRows = session.memberId
    ? await listCoachAnalyticsForMemberCoach(db, session.memberId)
    : [];
  const merged = new Map<string, CoachTeamAnalyticsRow>();
  for (const r of [...staffRows, ...memberRows]) {
    merged.set(r.analyticsId, r);
  }
  const rows = [...merged.values()];
  const totals = summarizeCoachAnalytics(rows);

  return NextResponse.json({ rows, totals });
}
