// app/api/admin/teams/rosters/[rosterId]/teams/[teamIndex]/players/[playerId]/route.ts
// FIXED: Support leadership object with multiple captains

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import {
  requirePermission,
  requireResourceAccess,
} from "@/lib/auth/middleware";

// UPDATE player details (number, position, leadership)
export async function PATCH(
  request: NextRequest,
  context: {
    params: Promise<{ rosterId: string; teamIndex: string; playerId: string }>;
  },
) {
  try {
    const {
      rosterId,
      teamIndex: teamIndexStr,
      playerId,
    } = await context.params;
    const teamIndex = parseInt(teamIndexStr);
    const body = await request.json();
    const { number, position, leadership } = body;


    const client = await clientPromise;
    const db = client.db();

    // Get roster
    const roster = await db.collection("teamRosters").findOne({ id: rosterId });
    if (!roster) {
      console.error("❌ Roster not found");
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
      console.error("❌ Team not found at index:", teamIndex);
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }


    // Find player
    const playerIndex = roster.teams[teamIndex].players.findIndex(
      (p: any) => p.id === playerId,
    );

    if (playerIndex === -1) {
      console.error("❌ Player not found:", playerId);
      return NextResponse.json(
        { error: "Player not found in team" },
        { status: 404 },
      );
    }

    const player = roster.teams[teamIndex].players[playerIndex];

    // Build updates
    const updatePath = `teams.${teamIndex}.players.${playerIndex}`;
    const updates: Record<string, unknown> = {};

    if (number !== undefined) {
      updates[`${updatePath}.number`] = number;
    }

    if (position !== undefined) {
      updates[`${updatePath}.position`] = position;
    }

    if (leadership !== undefined) {
      updates[`${updatePath}.leadership`] = leadership;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No updates provided" },
        { status: 400 },
      );
    }

    // Perform update
    const result = await db.collection("teamRosters").updateOne(
      { id: rosterId },
      {
        $set: {
          ...updates,
          lastUpdated: new Date().toISOString(),
        },
      },
    );


    if (result.modifiedCount === 0) {
      console.error("❌ Player not updated - no changes made");
      return NextResponse.json({ error: "No changes made" }, { status: 500 });
    }


    return NextResponse.json({
      success: true,
      modified: true,
    });
  } catch (error: unknown) {
    console.error("❌ Error updating player:", error);
    if (error instanceof Error) console.error("Stack:", error.stack);
    return NextResponse.json(
      {
        error: "Failed to update player",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

// DELETE player from team
export async function DELETE(
  request: NextRequest,
  context: {
    params: Promise<{ rosterId: string; teamIndex: string; playerId: string }>;
  },
) {
  try {
    const {
      rosterId,
      teamIndex: teamIndexStr,
      playerId,
    } = await context.params;
    const teamIndex = parseInt(teamIndexStr);


    const client = await clientPromise;
    const db = client.db();

    const roster = await db.collection("teamRosters").findOne({ id: rosterId });
    if (!roster) {
      return NextResponse.json({ error: "Roster not found" }, { status: 404 });
    }

    const { response: delPermRes } = await requirePermission(request, "team.edit");
    if (delPermRes) return delPermRes;
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

    // Find player
    const player = roster.teams[teamIndex].players.find(
      (p: any) => p.id === playerId,
    );
    if (!player) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }


    // Remove player from team using $pull
    const result = await db.collection("teamRosters").updateOne(
      { id: rosterId },
      {
        $pull: {
          [`teams.${teamIndex}.players`]: { id: playerId },
        },
        $set: {
          lastUpdated: new Date().toISOString(),
        },
      } as unknown as import("mongodb").UpdateFilter<import("mongodb").Document>,
    );


    if (result.modifiedCount === 0) {
      console.error("❌ Player not removed");
      return NextResponse.json(
        { error: "Failed to remove player" },
        { status: 500 },
      );
    }


    return NextResponse.json({
      success: true,
      removed: true,
    });
  } catch (error: unknown) {
    console.error("❌ Error deleting player:", error);
    return NextResponse.json(
      {
        error: "Failed to delete player",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
