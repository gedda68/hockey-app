// app/api/admin/players/[playerId]/status/route.ts
// API for player status data - FULL DATABASE INTEGRATION

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ playerId: string }> },
) {
  try {
    const { playerId } = await params; // ✅ AWAIT params

    console.log("📊 Fetching status data for player:", playerId);

    const client = await clientPromise;
    const db = client.db();

    const player = await db
      .collection("players")
      .findOne({ playerId }, { projection: { status: 1, _id: 0 } });

    if (!player) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    // Return status or default values
    const status = player.status || {
      current: "pending",
      registrationDate: "",
      expiryDate: "",
      renewalReminderDate: "",
      seasons: [],
    };

    console.log("✅ Status data retrieved");

    return NextResponse.json({ status });
  } catch (error: any) {
    console.error("❌ Error fetching status:", error);
    return NextResponse.json(
      { error: "Failed to fetch status", details: error.message },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ playerId: string }> },
) {
  try {
    const { playerId } = await params; // ✅ AWAIT params
    const status = await request.json();

    console.log("📝 Updating status for player:", playerId);

    // Add timestamp
    const updatedStatus = {
      ...status,
      updatedAt: new Date().toISOString(),
    };

    const client = await clientPromise;
    const db = client.db();

    const result = await db.collection("players").updateOne(
      { playerId },
      {
        $set: {
          status: updatedStatus,
          updatedAt: new Date().toISOString(),
        },
      },
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    console.log("✅ Status updated successfully");

    return NextResponse.json({
      success: true,
      status: updatedStatus,
      message: "Player status updated successfully",
    });
  } catch (error: any) {
    console.error("❌ Error updating status:", error);
    return NextResponse.json(
      { error: "Failed to update status", details: error.message },
      { status: 500 },
    );
  }
}
