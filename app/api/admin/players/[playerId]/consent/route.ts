// app/api/admin/players/[playerId]/consent/route.ts
// API for player consent & permissions data - FULL DATABASE INTEGRATION

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ playerId: string }> },
) {
  try {
    const { playerId } = await params; // ✅ AWAIT params

    console.log("📋 Fetching consent data for player:", playerId);

    const client = await clientPromise;
    const db = client.db();

    const player = await db
      .collection("players")
      .findOne({ playerId }, { projection: { consents: 1, _id: 0 } });

    if (!player) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    // Return consents or default values
    const consents = player.consents || {
      photoConsent: false,
      mediaConsent: false,
      transportConsent: false,
      firstAidConsent: false,
      emergencyTreatmentConsent: false,
    };

    console.log("✅ Consent data retrieved");

    return NextResponse.json({ consents });
  } catch (error: unknown) {
    console.error("❌ Error fetching consent:", error);
    return NextResponse.json(
      { error: "Failed to fetch consent", details: error.message },
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
    const consents = await request.json();

    console.log("📝 Updating consent for player:", playerId);

    // Add timestamp
    const updatedConsents = {
      ...consents,
      updatedAt: new Date().toISOString(),
    };

    const client = await clientPromise;
    const db = client.db();

    const result = await db.collection("players").updateOne(
      { playerId },
      {
        $set: {
          consents: updatedConsents,
          updatedAt: new Date().toISOString(),
        },
      },
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    console.log("✅ Consent updated successfully");

    return NextResponse.json({
      success: true,
      consents: updatedConsents,
      message: "Consent preferences updated successfully",
    });
  } catch (error: unknown) {
    console.error("❌ Error updating consent:", error);
    return NextResponse.json(
      { error: "Failed to update consent", details: error.message },
      { status: 500 },
    );
  }
}
