// app/api/admin/teams/rosters/[rosterId]/teams/[teamIndex]/players/route.ts
// Add player WITH selection history tracking in PLAYERS table

import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
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
    const db = client.db();

    // Get roster
    const roster = await db.collection("teamRosters").findOne({ id: rosterId });
    if (!roster) {
      return NextResponse.json({ error: "Roster not found" }, { status: 404 });
    }

    if (!roster.teams || !roster.teams[teamIndex]) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    // Get player from PLAYERS table
    const player = await db.collection("players").findOne({
      $or: [{ _id: new ObjectId(playerId) }, { playerId: playerId }],
    });

    if (!player) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    // Create player object for roster
    const rosterPlayer = {
      id: player._id.toString(),
      playerId: player.playerId,
      firstName: player.firstName,
      lastName: player.lastName,
      preferredName: player.preferredName || "",
      membershipNumber: player.club?.memberNumber || player.linkedMemberId,
      dateOfBirth: player.dateOfBirth,
      number: number || "",
      position: position || "",
      captain: false,
      viceCaptain: false,
    };

    const userId = "admin-temp";
    const userName = "Admin User";

    // Create selection history entry for ROSTER
    const rosterHistoryEntry = {
      id: `change-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      userId,
      userName,
      action: "player_added",
      details: {
        playerId: rosterPlayer.id,
        playerName: `${player.firstName} ${player.lastName}`,
        teamIndex,
        teamName: roster.teams[teamIndex].name,
        location: "team",
        number: number || "",
        position: position || "",
      },
    };

    // Create selection history entry for PLAYER
    const playerSelectionEntry = {
      id: `sel-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      season: roster.season || "2026",
      division: roster.division,
      category: roster.category,
      gender: roster.gender,
      teamName: roster.teams[teamIndex].name,
      rosterId: rosterId,

      // Selection details
      number: number || "",
      position: position || "",

      // Metadata
      selectedBy: userId,
      selectedByName: userName,
      selectedDate: new Date().toISOString(),

      // Active status
      deselectedDate: null,
      deselectedReason: null,

      // Optional game/week tracking
      weekNumber: null,
      gameDate: null,
    };

    // Update ROSTER - add player to team
    const updateField = `teams.${teamIndex}.players`;
    await db.collection("teamRosters").updateOne(
      { id: rosterId },
      {
        $push: {
          [updateField]: rosterPlayer,
          changeHistory: rosterHistoryEntry,
        },
        $set: { lastUpdated: new Date().toISOString() },
      },
    );

    // Update PLAYER - add to selection history
    await db.collection("players").updateOne(
      { _id: new ObjectId(playerId) },
      {
        $push: {
          teamSelectionHistory: playerSelectionEntry,
        },
      },
    );

    console.log(
      `✅ Added player ${player.firstName} ${player.lastName} to team ${roster.teams[teamIndex].name}`,
    );
    console.log(`   Number: ${number}, Position: ${position}`);
    console.log(`   Selection history saved to player record`);

    return NextResponse.json({
      success: true,
      player: rosterPlayer,
      history: {
        roster: rosterHistoryEntry,
        playerSelection: playerSelectionEntry,
      },
    });
  } catch (error: any) {
    console.error("❌ Error adding player to team:", error);
    return NextResponse.json(
      { error: "Failed to add player", details: error.message },
      { status: 500 },
    );
  }
}
