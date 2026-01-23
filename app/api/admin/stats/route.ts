import { NextResponse } from "next/server";
import clientPromise from "../../../../lib/mongodb";

export async function POST(request: Request) {
  try {
    const client = await clientPromise;
    const db = client.db("hockey-app");
    const body = await request.json();

    const {
      playerId,
      season,
      numberOfGames,
      goals,
      greenCards,
      yellowCards,
      redCards,
      assists,
      cleanSheets, // Relevant for Goalkeepers
    } = body;

    if (!playerId || !season) {
      return NextResponse.json(
        { error: "PlayerID and Season required" },
        { status: 400 }
      );
    }

    // Upsert statistics for that player in that specific season
    const result = await db.collection("statistics").updateOne(
      { playerId, season: season.toString() },
      {
        $set: {
          numberOfGames: Number(numberOfGames) || 0,
          goals: Number(goals) || 0,
          assists: Number(assists) || 0,
          cards: {
            green: Number(greenCards) || 0,
            yellow: Number(yellowCards) || 0,
            red: Number(redCards) || 0,
          },
          cleanSheets: Number(cleanSheets) || 0,
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
