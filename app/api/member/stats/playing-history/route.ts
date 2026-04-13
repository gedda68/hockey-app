/**
 * GET /api/member/stats/playing-history
 *
 * Playing history + aggregates for the logged-in member session.
 */

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getDatabase } from "@/lib/mongodb";
import {
  listPlayingHistoryForMember,
  summarizePlayingHistory,
} from "@/lib/stats/memberStatsService";

export async function GET() {
  const session = await getSession();
  if (!session?.memberId) {
    return NextResponse.json(
      { error: "Member session required" },
      { status: 401 },
    );
  }

  const db = await getDatabase();
  const rows = await listPlayingHistoryForMember(db, session.memberId);
  const summary = summarizePlayingHistory(rows);

  return NextResponse.json({ summary, events: rows });
}
