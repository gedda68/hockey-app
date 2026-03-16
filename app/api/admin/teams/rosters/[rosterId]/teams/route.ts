// app/api/admin/teams/rosters/[rosterId]/route.ts
// Update roster WITH MOVE HISTORY - FIXED drag & drop

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ rosterId: string }> },
) {
  try {
    const { rosterId } = await context.params;
    const body = await request.json();

    console.log("📝 Roster update request:", rosterId);
    console.log("📦 Body keys:", Object.keys(body));

    const client = await clientPromise;
    const db = client.db();

    const oldRoster = await db
      .collection("teamRosters")
      .findOne({ id: rosterId });
    if (!oldRoster) {
      console.error("❌ Roster not found:", rosterId);
      return NextResponse.json({ error: "Roster not found" }, { status: 404 });
    }

    const userId = "admin-temp";
    const userName = "Admin User";

    // Prepare the update
    const updates: any = {
      teams: body.teams || oldRoster.teams,
      shadowPlayers: body.shadowPlayers || oldRoster.shadowPlayers || [],
      withdrawn: body.withdrawn || oldRoster.withdrawn || [],
      lastUpdated: new Date().toISOString(),
    };

    // Handle move history if provided
    if (body.moveDetails) {
      const { player, from, to, reason } = body.moveDetails;

      let action = "player_moved";
      if (to.location === "unavailable") action = "player_unavailable";
      if (to.location === "emergency") action = "player_emergency";
      if (from.location === "unavailable") action = "player_returned";

      const historyEntry = {
        id: `change-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        userId,
        userName,
        action,
        details: {
          playerId: player.id,
          playerName: `${player.firstName} ${player.lastName}`,
          from: {
            location: from.location,
            teamIndex: from.teamIndex,
            teamName: from.teamName,
          },
          to: {
            location: to.location,
            teamIndex: to.teamIndex,
            teamName: to.teamName,
          },
          reason: reason || undefined,
        },
      };

      // Add to change history
      const existingHistory = oldRoster.changeHistory || [];
      updates.changeHistory = [...existingHistory, historyEntry];

      console.log(`📋 Move: ${player.firstName} ${player.lastName}`);
      console.log(`   From: ${from.location} ${from.teamName || ""}`);
      console.log(`   To: ${to.location} ${to.teamName || ""}`);
    }

    // Perform the update
    const result = await db
      .collection("teamRosters")
      .updateOne({ id: rosterId }, { $set: updates });

    if (result.matchedCount === 0) {
      console.error("❌ Update failed - roster not found");
      return NextResponse.json({ error: "Roster not found" }, { status: 404 });
    }

    if (result.modifiedCount === 0) {
      console.warn("⚠️ Update matched but nothing changed");
    }

    console.log(`✅ Roster updated successfully`);
    console.log(`   Teams: ${updates.teams.length}`);
    console.log(`   Emergency: ${updates.shadowPlayers.length}`);
    console.log(`   Unavailable: ${updates.withdrawn.length}`);

    return NextResponse.json({
      success: true,
      modified: result.modifiedCount > 0,
      roster: {
        id: rosterId,
        teams: updates.teams,
        shadowPlayers: updates.shadowPlayers,
        withdrawn: updates.withdrawn,
      },
    });
  } catch (error: any) {
    console.error("❌ Error updating roster:", error);
    console.error("Stack:", error.stack);
    return NextResponse.json(
      {
        error: "Failed to update roster",
        details: error.message,
        stack: error.stack,
      },
      { status: 500 },
    );
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ rosterId: string }> },
) {
  try {
    const { rosterId } = await context.params;
    const { searchParams } = new URL(request.url);
    const includeHistory = searchParams.get("includeHistory") === "true";

    const client = await clientPromise;
    const db = client.db();

    const roster = await db.collection("teamRosters").findOne({ id: rosterId });

    if (!roster) {
      return NextResponse.json({ error: "Roster not found" }, { status: 404 });
    }

    if (!includeHistory) {
      delete roster.changeHistory;
    }

    return NextResponse.json({
      roster,
      historyCount: roster.changeHistory?.length || 0,
    });
  } catch (error: any) {
    console.error("❌ Error fetching roster:", error);
    return NextResponse.json(
      { error: "Failed to fetch roster", details: error.message },
      { status: 500 },
    );
  }
}
