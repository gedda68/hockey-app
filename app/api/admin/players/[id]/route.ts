//app/api/players/[id]/route.ts

import { NextResponse } from "next/server";
import clientPromise from "../../../../../lib/mongodb";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const client = await clientPromise;
    const db = client.db("hockey-app");
    const playerId = params.id;

    // 1. Fetch Bio Data
    const bio = await db.collection("players").findOne({ playerId });

    if (!bio) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    // 2. Fetch All Seasonal Stats
    const stats = await db
      .collection("statistics")
      .find({ playerId })
      .sort({ season: -1 }) // Newest season first
      .toArray();

    return NextResponse.json({ bio, stats });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}
