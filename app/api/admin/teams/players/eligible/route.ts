// app/api/admin/teams/players/eligible/route.ts
// DEBUG VERSION - Fetch players from PLAYERS table with detailed logging

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clubId = searchParams.get("clubId");
    const division = searchParams.get("division");
    const category = searchParams.get("category");
    const gender = searchParams.get("gender");
    const season = searchParams.get("season") || "2026";


    if (!clubId) {
      return NextResponse.json(
        { error: "Club ID is required" },
        { status: 400 },
      );
    }

    const client = await clientPromise;
    const db = client.db();

    // First, let's check what's in the players collection
    const totalPlayers = await db.collection("players").countDocuments();

    // Check players for this club (simple query first)
    const clubPlayersCount = await db.collection("players").countDocuments({
      clubId: clubId,
    });

    // If no players with exact clubId, check what clubIds exist
    if (clubPlayersCount === 0) {
      const allClubIds = await db.collection("players").distinct("clubId");

      // Also check if club field exists
      const withClubField = await db.collection("players").countDocuments({
        club: { $exists: true },
      });
    }

    // Build query - START SIMPLE
    const query: Record<string, unknown> = {
      clubId: clubId,
    };


    // Execute query
    const players = await db
      .collection("players")
      .find(query)
      .limit(20) // Limit for debugging
      .toArray();


    // Log first player structure if found
    if (players.length > 0) {
        "📄 First player structure:",
        JSON.stringify(players[0], null, 2),
      );
    }

    // Map to response format
    const eligiblePlayers = players.map(() => ({
      id: player._id.toString(),
      playerId: player.playerId || "NO_PLAYER_ID",
      firstName: player.firstName || "Unknown",
      lastName: player.lastName || "Unknown",
      preferredName: player.preferredName || "",
      dateOfBirth: player.dateOfBirth || "",
      gender: player.gender || "",
      memberNumber:
        player.club?.memberNumber || player.linkedMemberId || "NO_MEMBER_NUM",
      primaryPosition: player.primaryPosition || "",
      secondaryPosition: player.secondaryPosition || "",
      teamSelectionHistory: player.teamSelectionHistory || [],
      lastSelection: getLastSelection(
        player.teamSelectionHistory || [],
        division,
        season,
      ),
    }));


    return NextResponse.json({
      players: eligiblePlayers,
      total: eligiblePlayers.length,
      source: "players_table",
      debug: {
        totalInDatabase: totalPlayers,
        matchingClubId: clubPlayersCount,
        query: query,
        foundPlayers: players.length,
      },
      filters: {
        clubId,
        division,
        category,
        gender,
        season,
      },
    });
  } catch (error: unknown) {
    console.error("❌ Error fetching eligible players:", error);
    console.error("Stack:", error.stack);
    return NextResponse.json(
      {
        error: "Failed to fetch players",
        details: error.message,
        stack: error.stack,
      },
      { status: 500 },
    );
  }
}

function getLastSelection(history: any[], division: string, season: string) {
  if (!history || history.length === 0) return null;

  const relevantSelections = history
    .filter(() => sel.division === division && sel.season === season)
    .sort(
      (a: any, b: any) =>
        new Date(b.selectedDate).getTime() - new Date(a.selectedDate).getTime(),
    );

  return relevantSelections[0] || null;
}
