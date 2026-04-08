// app/api/admin/teams/players/eligible/route.ts
// Fetch eligible players for a club from the members collection.

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import {
  requirePermission,
  requireResourceAccess,
} from "@/lib/auth/middleware";

export async function GET(request: NextRequest) {
  try {
    const { response: authRes } = await requirePermission(request, "team.roster");
    if (authRes) return authRes;

    const { searchParams } = new URL(request.url);
    const clubId   = searchParams.get("clubId");
    const division = searchParams.get("division") ?? "";
    const season   = searchParams.get("season") ?? new Date().getFullYear().toString();

    if (!clubId) {
      return NextResponse.json(
        { error: "Club ID is required" },
        { status: 400 },
      );
    }

    const { response: scopeRes } = await requireResourceAccess(
      request,
      "club",
      clubId,
    );
    if (scopeRes) return scopeRes;

    const client = await clientPromise;
    const db = client.db("hockey-app");

    // Query members that belong to this club and are active
    const members = await db
      .collection("members")
      .find({
        "membership.clubId": clubId,
        "membership.status": { $in: ["Active", "Life", "active"] },
      })
      .project({
        memberId:            1,
        personalInfo:        1,
        membership:          1,
        teamSelectionHistory: 1,
      })
      .limit(200)
      .toArray();

    const eligiblePlayers = members.map((m) => {
      const pi  = m.personalInfo ?? {};
      const mem = m.membership   ?? {};
      return {
        id:                   m._id.toString(),
        playerId:             m.memberId,
        memberId:             m.memberId,
        firstName:            pi.firstName   ?? "Unknown",
        lastName:             pi.lastName    ?? "Unknown",
        preferredName:        pi.preferredName ?? "",
        dateOfBirth:          pi.dateOfBirth ?? "",
        gender:               pi.gender      ?? "",
        memberNumber:         mem.memberNumber ?? m.memberId,
        primaryPosition:      mem.primaryPosition   ?? pi.primaryPosition   ?? "",
        secondaryPosition:    mem.secondaryPosition ?? pi.secondaryPosition ?? "",
        teamSelectionHistory: m.teamSelectionHistory ?? [],
        lastSelection:        getLastSelection(m.teamSelectionHistory ?? [], division, season),
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

function getLastSelection(history: any[], division: string, season: string) {
  if (!history || history.length === 0) return null;

  const relevantSelections = history
    .filter((sel: any) => sel.division === division && sel.season === season)
    .sort(
      (a: any, b: any) =>
        new Date(b.selectedDate).getTime() - new Date(a.selectedDate).getTime(),
    );

  return relevantSelections[0] ?? null;
}
