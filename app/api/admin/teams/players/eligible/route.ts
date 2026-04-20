// app/api/admin/teams/players/eligible/route.ts
// Fetch eligible players for a club from the members collection.

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import {
  requirePermission,
  requireResourceAccess,
} from "@/lib/auth/middleware";
import {
  ACTIVE_MEMBERSHIP_STATUSES,
  memberBelongsToClubFilter,
} from "@/lib/rosters/memberClubQuery";

interface SelectionRecord {
  division?: string;
  season?: string;
  selectedDate?: string;
  [key: string]: unknown;
}

interface EligiblePlayer {
  id: string;
  playerId: string;
  memberId: string;
  firstName: string;
  lastName: string;
  preferredName: string;
  dateOfBirth: string;
  gender: string;
  memberNumber: string;
  primaryPosition: string;
  secondaryPosition: string;
  teamSelectionHistory: SelectionRecord[];
  lastSelection: SelectionRecord | null;
}

export async function GET(request: NextRequest) {
  try {
    const { response: authRes } = await requirePermission(request, "team.roster");
    if (authRes) return authRes;

    const { searchParams } = new URL(request.url);
    const clubId   = searchParams.get("clubId");
    const division = searchParams.get("division") ?? "";
    const season   = searchParams.get("season") ?? new Date().getFullYear().toString();

    if (!clubId) {
      return NextResponse.json({ error: "Club ID is required" }, { status: 400 });
    }

    const { response: scopeRes } = await requireResourceAccess(request, "club", clubId);
    if (scopeRes) return scopeRes;

    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || "hockey-app");

    const members = await db
      .collection("members")
      .find({
        ...memberBelongsToClubFilter(clubId),
        "membership.status": { $in: ACTIVE_MEMBERSHIP_STATUSES },
      })
      .project({
        memberId:             1,
        personalInfo:         1,
        membership:           1,
        teamSelectionHistory: 1,
      })
      .limit(200)
      .toArray();

    const eligiblePlayers: EligiblePlayer[] = members.map((m) => {
      const pi  = (m.personalInfo  ?? {}) as Record<string, string>;
      const mem = (m.membership    ?? {}) as Record<string, string>;
      const history = (m.teamSelectionHistory ?? []) as SelectionRecord[];
      return {
        id:                   m._id.toString(),
        playerId:             m.memberId as string,
        memberId:             m.memberId as string,
        firstName:            pi.firstName   ?? "Unknown",
        lastName:             pi.lastName    ?? "Unknown",
        preferredName:        pi.preferredName ?? "",
        dateOfBirth:          pi.dateOfBirth ?? "",
        gender:               pi.gender      ?? "",
        memberNumber:         mem.memberNumber ?? (m.memberId as string),
        primaryPosition:      mem.primaryPosition   ?? pi.primaryPosition   ?? "",
        secondaryPosition:    mem.secondaryPosition ?? pi.secondaryPosition ?? "",
        teamSelectionHistory: history,
        lastSelection:        getLastSelection(history, division, season),
      };
    });

    return NextResponse.json({
      players: eligiblePlayers,
      total:   eligiblePlayers.length,
      filters: { clubId, division, season },
    });
  } catch (error: unknown) {
    console.error("❌ Error fetching eligible players:", error);
    return NextResponse.json(
      {
        error:   "Failed to fetch players",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

function getLastSelection(
  history: SelectionRecord[],
  division: string,
  season: string,
): SelectionRecord | null {
  if (!history || history.length === 0) return null;

  const relevant = history
    .filter((sel) => sel.division === division && sel.season === season)
    .sort((a, b) => {
      const aTime = a.selectedDate ? new Date(a.selectedDate).getTime() : 0;
      const bTime = b.selectedDate ? new Date(b.selectedDate).getTime() : 0;
      return bTime - aTime;
    });

  return relevant[0] ?? null;
}
