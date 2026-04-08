// app/api/admin/config/committee-positions/route.ts
// API for managing committee positions configuration

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { requirePermission } from "@/lib/auth/middleware";

const DEFAULT_POSITIONS = [
  "President",
  "Vice President",
  "Secretary",
  "Treasurer",
  "Committee Member",
  "Coach Coordinator",
  "Registrar",
  "Junior Coordinator",
  "Senior Coordinator",
  "Volunteer Coordinator",
];

export async function GET(request: NextRequest) {
  try {
    const { response: authRes } = await requirePermission(
      request,
      "system.settings",
    );
    if (authRes) return authRes;

    const client = await clientPromise;
    const db = client.db();

    const config = await db
      .collection("config")
      .findOne({ type: "committee-positions" });

    if (config && config.positions) {
      return NextResponse.json(config.positions);
    }

    // Return defaults if no config exists
    return NextResponse.json(DEFAULT_POSITIONS);
  } catch (error: unknown) {
    console.error("Error fetching positions:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { response: authRes } = await requirePermission(
      request,
      "system.settings",
    );
    if (authRes) return authRes;

    const { positions } = await request.json();

    if (!Array.isArray(positions)) {
      return NextResponse.json(
        { error: "Positions must be an array" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db();

    await db.collection("config").updateOne(
      { type: "committee-positions" },
      {
        $set: {
          positions,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          type: "committee-positions",
          createdAt: new Date(),
        },
      },
      { upsert: true }
    );

    return NextResponse.json({
      message: "Committee positions updated successfully",
      positions,
    });
  } catch (error: unknown) {
    console.error("Error updating positions:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
