// app/api/admin/players/check-duplicate/route.ts
// Check if a player already exists based on firstName, lastName, dateOfBirth

import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { firstName, lastName, dateOfBirth } = await request.json();

    if (!firstName || !lastName || !dateOfBirth) {
      return NextResponse.json(
        { error: "firstName, lastName, and dateOfBirth are required" },
        { status: 400 },
      );
    }

    console.log("🔍 Checking for duplicate player:", {
      firstName,
      lastName,
      dateOfBirth,
    });

    // TODO: Replace with your actual database query
    // import { connectDB } from '@/lib/mongodb';
    // const db = await connectDB();

    // const existingPlayer = await db.collection('players').findOne({
    //   firstName: { $regex: new RegExp(`^${firstName}$`, 'i') }, // Case-insensitive
    //   lastName: { $regex: new RegExp(`^${lastName}$`, 'i') },   // Case-insensitive
    //   dateOfBirth: dateOfBirth
    // });
    //
    // if (existingPlayer) {
    //   return NextResponse.json({
    //     isDuplicate: true,
    //     existingPlayer: {
    //       playerId: existingPlayer.playerId,
    //       firstName: existingPlayer.firstName,
    //       lastName: existingPlayer.lastName,
    //       dateOfBirth: existingPlayer.dateOfBirth,
    //       clubId: existingPlayer.clubId,
    //     }
    //   });
    // }
    //
    // return NextResponse.json({ isDuplicate: false });

    // TEMPORARY MOCK - Always returns not duplicate
    console.log("⚠️ Using mock duplicate check - implement database query");

    return NextResponse.json({
      isDuplicate: false,
      message: "MOCK DATA - Implement database query to check for duplicates",
    });
  } catch (error: unknown) {
    console.error("❌ Error checking duplicate player:", error);
    return NextResponse.json(
      { error: "Failed to check duplicate", details: error.message },
      { status: 500 },
    );
  }
}
