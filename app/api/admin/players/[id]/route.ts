// app/api/admin/players/[playerId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

type Ctx = { params: Promise<{ playerId: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    const { playerId } = await ctx.params;
    const client = await clientPromise;
    const db = client.db();

    const player = await db.collection("players").findOne({ playerId });

    if (!player) {
      console.error(`Player not found: ${playerId}`);
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    // Remove MongoDB _id
    const { _id, ...playerData } = player;

    console.log(
      `✅ Found player: ${playerData.firstName} ${playerData.lastName}`,
    );

    return NextResponse.json({ player: playerData });
  } catch (error: any) {
    console.error("Error fetching player:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  try {
    const { playerId } = await ctx.params;
    const body = await req.json();
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

    // Cleanup internal MongoDB _id
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
    console.error("Error updating player:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  try {
    const { playerId } = await ctx.params;
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
    console.error("Error deleting player:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
