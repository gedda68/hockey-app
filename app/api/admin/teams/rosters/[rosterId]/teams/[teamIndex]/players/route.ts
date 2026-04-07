// app/api/admin/teams/rosters/[rosterId]/teams/[teamIndex]/players/route.ts
// Add player to a team roster + record selection history on the member.

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

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

    if (!roster.teams || !roster.teams[teamIndex]) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    // Look up player from members collection (playerId === memberId)
    const member = await db.collection("members").findOne({ memberId: playerId });
    if (!member) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
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
