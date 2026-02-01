// app/api/admin/config/committee-positions/route.ts
// API for managing committee positions configuration

import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

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

export async function GET() {
  try {
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
  } catch (error: any) {
    console.error("Error fetching positions:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
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
  } catch (error: any) {
    console.error("Error updating positions:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
