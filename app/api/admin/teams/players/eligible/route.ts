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

    console.log("📋 Eligible Players Query:");
    console.log("  clubId:", clubId);
    console.log("  division:", division);
    console.log("  category:", category);
    console.log("  gender:", gender);
    console.log("  season:", season);

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
    console.log(`📊 Total players in database: ${totalPlayers}`);

    // Check players for this club (simple query first)
    const clubPlayersCount = await db.collection("players").countDocuments({
      clubId: clubId,
    });
    console.log(`🏒 Players with clubId "${clubId}": ${clubPlayersCount}`);

    // If no players with exact clubId, check what clubIds exist
    if (clubPlayersCount === 0) {
      const allClubIds = await db.collection("players").distinct("clubId");
      console.log("⚠️ No players found with this clubId");
      console.log("📋 Available clubIds in database:", allClubIds);

      // Also check if club field exists
      const withClubField = await db.collection("players").countDocuments({
        club: { $exists: true },
      });
      console.log(`📁 Players with 'club' field (nested): ${withClubField}`);
    }

    // Build query - START SIMPLE
    const query: any = {
      clubId: clubId,
    };

    console.log("🔍 Query:", JSON.stringify(query, null, 2));

    // Execute query
    const players = await db
      .collection("players")
      .find(query)
      .limit(20) // Limit for debugging
      .toArray();

    console.log(`✅ Found ${players.length} players`);

    // Log first player structure if found
    if (players.length > 0) {
      console.log(
        "📄 First player structure:",
        JSON.stringify(players[0], null, 2),
      );
    }

    // Map to response format
    const eligiblePlayers = players.map((player: any) => ({
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

    console.log(`✅ Returning ${eligiblePlayers.length} eligible players`);

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
  } catch (error: any) {
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
    .filter((sel: any) => sel.division === division && sel.season === season)
    .sort(
      (a: any, b: any) =>
        new Date(b.selectedDate).getTime() - new Date(a.selectedDate).getTime(),
    );

  return relevantSelections[0] || null;
}
