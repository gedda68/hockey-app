// app/api/admin/players/fix-duplicates/route.ts
// Quick fix for duplicate playerIds
// Just visit: http://localhost:3000/api/admin/players/fix-duplicates

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 Checking for duplicate playerIds...");

    const client = await clientPromise;
    const db = client.db();

    // Find duplicates
    const duplicates = await db
      .collection("players")
      .aggregate([
        {
          $group: {
            _id: "$playerId",
            count: { $sum: 1 },
            players: { $push: "$$ROOT" },
          },
        },
        { $match: { count: { $gt: 1 } } },
      ])
      .toArray();

    if (duplicates.length === 0) {
      console.log("✅ No duplicates found");
      return NextResponse.json({
        success: true,
        message: "No duplicate playerIds found! ✅",
        duplicates: 0,
        fixed: 0,
      });
    }

    console.log(`❌ Found ${duplicates.length} duplicate groups`);

    // Get highest numeric playerId
    const lastPlayer = await db
      .collection("players")
      .find({ playerId: /^\d{10}$/ })
      .sort({ playerId: -1 })
      .limit(1)
      .toArray();

    let nextId =
      lastPlayer.length > 0 ? parseInt(lastPlayer[0].playerId) + 1 : 1;

    let fixed = 0;
    const fixedDetails: any[] = [];

    // Fix each duplicate group
    for (const dup of duplicates) {
      console.log(`\n📝 Fixing playerId: ${dup._id} (${dup.count} duplicates)`);

      // Keep first player, reassign others
      const [first, ...rest] = dup.players;
      console.log(`  ✅ Keeping: ${first.firstName} ${first.lastName}`);

      for (const player of rest) {
        const newPlayerId = nextId.toString().padStart(10, "0");

        await db
          .collection("players")
          .updateOne(
            { _id: player._id },
            {
              $set: {
                playerId: newPlayerId,
                updatedAt: new Date().toISOString(),
              },
            },
          );

        const detail = {
          name: `${player.firstName} ${player.lastName}`,
          oldId: dup._id,
          newId: newPlayerId,
        };

        console.log(`  🔄 ${detail.name}: ${detail.oldId} → ${detail.newId}`);
        fixedDetails.push(detail);

        nextId++;
        fixed++;
      }
    }

    console.log("\n✅ All duplicates fixed!");

    return NextResponse.json({
      success: true,
      message: `Fixed ${fixed} duplicate playerIds! ✅`,
      duplicates: duplicates.length,
      fixed,
      details: fixedDetails,
    });
  } catch (error: unknown) {
    console.error("❌ Error fixing duplicates:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 },
    );
  }
}

// Also allow POST
export async function POST(request: NextRequest) {
  return GET(request);
}
