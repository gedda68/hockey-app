// app/api/admin/teams/rosters/[rosterId]/teams/[teamIndex]/players/route.ts
// Add player to a team roster + record selection history on the member.

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
import { sendTeamSelectionEmail } from "@/lib/notifications/teamSelectionNotify";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ rosterId: string; teamIndex: string }> },
) {
  try {
    const { rosterId, teamIndex: teamIndexStr } = await context.params;
    const teamIndex = parseInt(teamIndexStr);
    const body = await request.json();
    const { playerId, number, position } = body;

    if (!playerId) {
      return NextResponse.json(
        { error: "Player ID is required" },
        { status: 400 },
      );
    }

    const client = await clientPromise;
    const db = client.db("hockey-app");

    // Get roster
    const roster = await db.collection("teamRosters").findOne({ id: rosterId });
    if (!roster) {
      return NextResponse.json({ error: "Roster not found" }, { status: 404 });
    }

    const { response: permRes } = await requirePermission(request, "team.edit");
    if (permRes) return permRes;
    if (roster.clubId) {
      const { response: scopeRes } = await requireResourceAccess(
        request,
        "club",
        String(roster.clubId),
      );
      if (scopeRes) return scopeRes;
    }

    if (!roster.teams || !roster.teams[teamIndex]) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    const rosterClubId = roster.clubId != null ? String(roster.clubId) : "";
    if (!rosterClubId) {
      return NextResponse.json(
        { error: "Roster has no club; cannot verify membership" },
        { status: 400 },
      );
    }

    const member = await db.collection("members").findOne({
      memberId: playerId,
      ...memberBelongsToClubFilter(rosterClubId),
      "membership.status": { $in: ACTIVE_MEMBERSHIP_STATUSES },
    });
    if (!member) {
      return NextResponse.json(
        {
          error:
            "Player not found or not an active member of this club",
          code: "NOT_CLUB_MEMBER",
        },
        { status: 403 },
      );
    }

    const pi  = member.personalInfo ?? {};
    const mem = member.membership   ?? {};

    // Create player object for roster
    const rosterPlayer = {
      id:               member.memberId,
      playerId:         member.memberId,
      memberId:         member.memberId,
      firstName:        pi.firstName   ?? "",
      lastName:         pi.lastName    ?? "",
      preferredName:    pi.preferredName ?? "",
      membershipNumber: mem.memberNumber ?? member.memberId,
      dateOfBirth:      pi.dateOfBirth ?? "",
      number:           number   ?? "",
      position:         position ?? "",
      captain:          false,
      viceCaptain:      false,
    };

    const userId   = "admin-temp";
    const userName = "Admin User";

    // Selection history entry for the roster change log
    const rosterHistoryEntry = {
      id:        `change-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      userId,
      userName,
      action:    "player_added",
      details: {
        playerId:  member.memberId,
        playerName:`${pi.firstName ?? ""} ${pi.lastName ?? ""}`.trim(),
        teamIndex,
        teamName:  roster.teams[teamIndex].name,
        location:  "team",
        number:    number   ?? "",
        position:  position ?? "",
      },
    };

    // Selection history entry stored on the member
    const memberSelectionEntry = {
      id:            `sel-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      season:        roster.season   ?? new Date().getFullYear().toString(),
      division:      roster.division ?? "",
      category:      roster.category ?? "",
      gender:        roster.gender   ?? "",
      teamName:      roster.teams[teamIndex].name,
      rosterId,
      number:        number   ?? "",
      position:      position ?? "",
      selectedBy:    userId,
      selectedByName:userName,
      selectedDate:  new Date().toISOString(),
      deselectedDate:   null,
      deselectedReason: null,
      weekNumber:    null,
      gameDate:      null,
    };

    // Add player to team roster
    const updateField = `teams.${teamIndex}.players`;
    await db.collection("teamRosters").updateOne(
      { id: rosterId },
      {
        $push: {
          [updateField]:  rosterPlayer,
          changeHistory:  rosterHistoryEntry,
        } as any,
        $set: { lastUpdated: new Date().toISOString() },
      },
    );

    // Record selection history on the member
    await db.collection("members").updateOne(
      { memberId: member.memberId },
      {
        $push: { teamSelectionHistory: memberSelectionEntry } as any,
        $set:  { updatedAt: new Date().toISOString() },
      },
    );

    const contact = (member as { contact?: { email?: string } }).contact;
    const to = contact?.email?.trim();
    const displayName =
      `${pi.firstName ?? ""} ${pi.lastName ?? ""}`.trim() ||
      (member as { personalInfo?: { displayName?: string } }).personalInfo
        ?.displayName ||
      member.memberId;
    const clubName =
      (roster as { clubName?: string }).clubName?.trim() || "your club";
    if (to) {
      void sendTeamSelectionEmail({
        to,
        memberDisplayName: displayName,
        clubName,
        teamName: roster.teams[teamIndex].name,
        division: String(roster.division ?? ""),
        season: String(roster.season ?? new Date().getFullYear()),
      }).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      player: rosterPlayer,
      history: {
        roster:          rosterHistoryEntry,
        playerSelection: memberSelectionEntry,
      },
    });
  } catch (error: unknown) {
    console.error("❌ Error adding player to team:", error);
    return NextResponse.json(
      {
        error:   "Failed to add player",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
