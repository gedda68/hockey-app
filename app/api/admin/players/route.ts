// app/api/admin/players/route.ts
// FIXED: POST now generates playerId automatically
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

// GET: Fetch all players with filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const clubId = searchParams.get("clubId");
    const status = searchParams.get("status");
    const gender = searchParams.get("gender");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "100");
    const skip = (page - 1) * limit;

    const client = await clientPromise;
    const db = client.db();

    // Build query
    const query: any = {};

    if (clubId) query.clubId = clubId;

    if (status) {
      query.active = status === "active";
    }

    if (gender) query.gender = gender;

    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { preferredName: { $regex: search, $options: "i" } },
      ];
    }

    console.log("🏃 GET players - Query:", query);

    // Get total count
    const total = await db.collection("players").countDocuments(query);

    // Get players
    const players = await db
      .collection("players")
      .find(query)
      .sort({ lastName: 1, firstName: 1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    console.log(`✅ Found ${players.length} players (${total} total)`);

    // Get all unique club IDs from players
    const clubIds = [...new Set(players.map((p) => p.clubId).filter(Boolean))];
    console.log(`🔍 Looking up ${clubIds.length} clubs...`);
    console.log(`🔍 Club IDs to find:`, clubIds);

    // Fetch club names - try both clubId and id fields
    const clubs = await db
      .collection("clubs")
      .find({
        $or: [{ clubId: { $in: clubIds } }, { id: { $in: clubIds } }],
      })
      .toArray();

    console.log(`✅ Found ${clubs.length} clubs in database`);

    // Create club lookup map (check both clubId and id)
    const clubMap = new Map();
    clubs.forEach((club: any) => {
      const id = club.clubId || club.id;
      if (id) {
        clubMap.set(id, club.name);
        console.log(`📌 Club: ${id} → ${club.name}`);
      }
    });

    // Add club name to each player
    const playersWithClubNames = players.map((player: any) => {
      const { _id, ...playerData } = player;
      const clubName = player.clubId ? clubMap.get(player.clubId) : null;

      console.log(
        `👤 ${player.firstName} ${player.lastName}: clubId=${player.clubId}, clubName=${clubName || "NOT FOUND"}`,
      );

      return {
        ...playerData,
        clubName: clubName || null, // Include club name in response
      };
    });

    return NextResponse.json({
      players: playersWithClubNames,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("💥 Error fetching players:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Create new player
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // ✅ FIXED: Only validate firstName and lastName (playerId is generated)
    if (!body.firstName || !body.lastName) {
      return NextResponse.json(
        { error: "First name and last name are required" },
        { status: 400 },
      );
    }

    const client = await clientPromise;
    const db = client.db();

    // ✅ Generate sequential playerId
    const lastPlayer = await db
      .collection("players")
      .find({})
      .sort({ playerId: -1 })
      .limit(1)
      .toArray();

    let nextNumber = 1;
    if (lastPlayer.length > 0 && lastPlayer[0].playerId) {
      const lastNumber = parseInt(lastPlayer[0].playerId);
      if (!isNaN(lastNumber)) {
        nextNumber = lastNumber + 1;
      }
    }

    const playerId = nextNumber.toString().padStart(10, "0");
    console.log("🆔 Generated playerId:", playerId);

    const playerData = {
      ...body,
      playerId, // ✅ Add generated playerId
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      active: body.active !== undefined ? body.active : true,
      registrationStatus: body.registrationStatus || "pending",

      // Ensure arrays exist
      emergencyContacts: body.emergencyContacts || [],
      guardians: body.guardians || [],
      teamIds: body.teamIds || [],
      documents: body.documents || [],
      playHistory: body.playHistory || [],

      // Ensure medical object exists
      medical: {
        conditions: "",
        allergies: "",
        medications: "",
        doctorName: "",
        doctorPhone: "",
        healthFundName: "",
        healthFundNumber: "",
        medicareNumber: "",
        ...body.medical,
      },
    };

    await db.collection("players").insertOne(playerData);

    console.log(
      `✅ Created player: ${body.firstName} ${body.lastName} (${playerId})`,
    );

    // Remove _id before returning
    const { _id, ...cleanPlayer } = playerData;

    return NextResponse.json(
      {
        message: "Player created",
        player: cleanPlayer,
        playerId, // ✅ Return playerId so client can use it
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("💥 Error creating player:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT: Update player
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { playerId } = body;

    if (!playerId) {
      return NextResponse.json(
        { error: "Player ID required" },
        { status: 400 },
      );
    }

    const client = await clientPromise;
    const db = client.db();

    const oldData = await db.collection("players").findOne({ playerId });

    if (!oldData) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    const newData = {
      ...oldData,
      ...body,
      playerId, // Ensure playerId stays the same
      updatedAt: new Date().toISOString(),

      // Ensure arrays exist
      emergencyContacts:
        body.emergencyContacts || oldData.emergencyContacts || [],
      guardians: body.guardians || oldData.guardians || [],
      teamIds: body.teamIds || oldData.teamIds || [],
      documents: body.documents || oldData.documents || [],
      playHistory: body.playHistory || oldData.playHistory || [],

      // Merge medical data
      medical: {
        ...oldData.medical,
        ...body.medical,
      },
    };

    // Cleanup internal MongoDB _id if present in body
    delete (newData as any)._id;

    await db.collection("players").updateOne({ playerId }, { $set: newData });

    console.log(`✅ Updated player: ${newData.firstName} ${newData.lastName}`);

    // Remove _id before returning
    const { _id, ...cleanPlayer } = newData;

    return NextResponse.json({
      message: "Player updated",
      player: cleanPlayer,
    });
  } catch (error: any) {
    console.error("💥 Error updating player:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: Remove player
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const playerId = searchParams.get("playerId");

    if (!playerId) {
      return NextResponse.json(
        { error: "Player ID required" },
        { status: 400 },
      );
    }

    const client = await clientPromise;
    const db = client.db();

    const player = await db.collection("players").findOne({ playerId });

    if (!player) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    await db.collection("players").deleteOne({ playerId });

    console.log(`✅ Deleted player: ${player.firstName} ${player.lastName}`);

    return NextResponse.json({ message: "Player deleted successfully" });
  } catch (error: any) {
    console.error("💥 Error deleting player:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
