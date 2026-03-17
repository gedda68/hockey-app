// app/api/admin/players/[playerId]/route.ts
// GET individual player by playerId

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ playerId: string }> },
) {
  try {
    const { playerId } = await params; // ✅ AWAIT params

    console.log("📋 Fetching player:", playerId);

    const client = await clientPromise;
    const db = client.db();

    const player = await db.collection("players").findOne({ playerId });

    if (!player) {
      console.error(`❌ Player not found: ${playerId}`);
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    console.log(`✅ Found player: ${player.firstName} ${player.lastName}`);

    // Remove MongoDB _id
    const { _id, ...cleanPlayer } = player;

    return NextResponse.json({ player: cleanPlayer });
  } catch (error: any) {
    console.error("💥 Error fetching player:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ playerId: string }> },
) {
  try {
    const { playerId } = await params; // ✅ AWAIT params
    const body = await request.json();

    console.log("📝 Updating player:", playerId);

    if (!body.firstName || !body.lastName) {
      return NextResponse.json(
        { error: "First name and last name are required" },
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
      notes: body.notes || oldData.notes || [],

      // Merge medical data
      medical: {
        ...oldData.medical,
        ...body.medical,
      },

      // Merge club data
      club: {
        ...oldData.club,
        ...body.club,
      },

      // Merge status data
      status: {
        ...oldData.status,
        ...body.status,
      },

      // Merge consents data
      consents: {
        ...oldData.consents,
        ...body.consents,
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
      playerId,
    });
  } catch (error: any) {
    console.error("💥 Error updating player:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ─── PATCH /api/admin/players/[playerId] ─────────────────────────────────────
// Appends entries to tournamentHistory and/or feeHistory arrays.
// Uses special flags: _appendTournamentHistory and _appendFeeHistory
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ playerId: string }> },
) {
  try {
    const { playerId } = await params;
    const body = await request.json();

    const client = await clientPromise;
    const db = client.db();

    const player = await db.collection("players").findOne({ playerId });
    if (!player) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    const pushFields: Record<string, any> = {};
    const setFields: Record<string, any> = { updatedAt: new Date().toISOString() };

    if (body._appendTournamentHistory && Array.isArray(body.tournamentHistory)) {
      pushFields.tournamentHistory = { $each: body.tournamentHistory };
    }
    if (body._appendFeeHistory && Array.isArray(body.feeHistory)) {
      pushFields.feeHistory = { $each: body.feeHistory };
    }

    const update: Record<string, any> = { $set: setFields };
    if (Object.keys(pushFields).length > 0) {
      update.$push = pushFields;
    }

    await db.collection("players").updateOne({ playerId }, update);

    return NextResponse.json({ message: "Player history updated", playerId });
  } catch (error: any) {
    console.error("💥 Error patching player:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ playerId: string }> },
) {
  try {
    const { playerId } = await params; // ✅ AWAIT params

    console.log("🗑️ Deleting player:", playerId);

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
