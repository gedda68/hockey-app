// app/api/admin/players/next-registration-number/route.ts
// Get next available registration number from players.playerId

import { NextResponse } from "next/server";

export async function GET() {
  try {
    // TODO: Replace with your actual database connection
    // import { connectDB } from '@/lib/mongodb';
    // const db = await connectDB();

    // Get all players and find the highest playerId number
    // const players = await db.collection('players')
    //   .find({})
    //   .sort({ playerId: -1 })
    //   .limit(100) // Get last 100 to be safe
    //   .toArray();

    // let maxNumber = 0;
    //
    // for (const player of players) {
    //   if (player.playerId) {
    //     // Extract numeric part from playerId
    //     // playerId format could be: "player-1234-xxx" or just "0000000042"
    //     const numericPart = player.playerId.match(/\d+/);
    //     if (numericPart) {
    //       const num = parseInt(numericPart[0]);
    //       if (num > maxNumber) {
    //         maxNumber = num;
    //       }
    //     }
    //   }
    // }
    //
    // // Next number is maxNumber + 1
    // const nextNumber = maxNumber + 1;
    //
    // // Format with leading zeros (10 digits total)
    // const formattedNumber = nextNumber.toString().padStart(10, '0');
    //
    // return NextResponse.json({
    //   nextNumber: formattedNumber,
    //   lastNumber: maxNumber
    // });

    // TEMPORARY MOCK - Replace with actual database query above
    console.log("⚠️ Using mock registration number - implement database query");

    return NextResponse.json({
      nextNumber: "0000000001",
      message: "MOCK DATA - Implement database query to find highest playerId",
    });
  } catch (error: any) {
    console.error("❌ Error getting next registration number:", error);
    return NextResponse.json(
      {
        error: "Failed to get next registration number",
        nextNumber: "0000000001", // Fallback to first number
      },
      { status: 500 },
    );
  }
}
