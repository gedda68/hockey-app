// app/api/admin/players/route.ts

import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

const getAUDate = () => {
  return new Date().toLocaleDateString("en-AU").split("/").join("-");
};

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("hockey-app");
    // Fetches existing players from hockey-app.players.json collection
    const players = await db.collection("players").find({}).toArray();
    return NextResponse.json(players || []);
  } catch (error: any) {
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const client = await clientPromise;
    const db = client.db("hockey-app");
    const body = await request.json();

    const newPlayer = {
      playerId: body.playerId || `P-${Date.now()}`,
      name: body.name,
      clubId: body.clubId,
      primaryPosition: body.primaryPosition,
      secondaryPosition: body.secondaryPosition || "N/A",
      status: {
        active: true,
        effectiveDate: getAUDate(),
        reason: "",
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.collection("players").insertOne(newPlayer);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const client = await clientPromise;
    const db = client.db("hockey-app");
    const body = await request.json();
    const { playerId, ...updates } = body;

    // 1. Fetch current version to compare status
    const existingPlayer = await db.collection("players").findOne({ playerId });
    if (!existingPlayer)
      return NextResponse.json({ error: "Player not found" }, { status: 404 });

    let historyEntry = null;

    // 2. Logic: If 'active' status or 'reason' has changed, create a history log
    if (
      existingPlayer.status.active !== updates.active ||
      existingPlayer.status.reason !== updates.statusReason
    ) {
      const newStatus = updates.active
        ? "Active"
        : `Inactive (${updates.statusReason})`;
      historyEntry = {
        date: updates.statusDate || getAUDate(),
        event: `Status changed from ${
          existingPlayer.status.active ? "Active" : "Inactive"
        } to ${newStatus}`,
      };
    }

    // 3. Construct the update object
    const updateOperation: any = {
      $set: {
        name: updates.name,
        clubId: updates.clubId,
        primaryPosition: updates.primaryPosition,
        secondaryPosition: updates.secondaryPosition,
        status: {
          active: updates.active,
          reason: updates.active ? "" : updates.statusReason,
          effectiveDate: updates.statusDate || getAUDate(),
        },
        updatedAt: new Date().toISOString(),
      },
    };

    // 4. Push to history only if there's a change
    if (historyEntry) {
      updateOperation.$push = { history: historyEntry };
    }

    await db.collection("players").updateOne({ playerId }, updateOperation);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
