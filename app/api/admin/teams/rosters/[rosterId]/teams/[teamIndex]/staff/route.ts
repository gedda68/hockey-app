// app/api/admin/teams/rosters/[rosterId]/teams/[teamIndex]/staff/route.ts
// FIXED: Add staff with proper error handling and logging

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ rosterId: string; teamIndex: string }> },
) {
  try {
    const { rosterId, teamIndex: teamIndexStr } = await context.params;
    const teamIndex = parseInt(teamIndexStr);
    const body = await request.json();

    console.log("\n=== ADD STAFF API ===");
    console.log("📋 Roster ID:", rosterId);
    console.log("📋 Team Index:", teamIndex);
    console.log("📦 Body:", JSON.stringify(body, null, 2));

    const { role, memberId, memberName, qualifications } = body;

    if (!role || !memberId) {
      console.error("❌ Missing required fields");
      return NextResponse.json(
        { error: "Role and member ID are required" },
        { status: 400 },
      );
    }

    const client = await clientPromise;
    const db = client.db();

    // Get roster
    const roster = await db.collection("teamRosters").findOne({ id: rosterId });
    if (!roster) {
      console.error("❌ Roster not found:", rosterId);
      return NextResponse.json({ error: "Roster not found" }, { status: 404 });
    }

    console.log("✅ Found roster:", roster.clubName);

    // Check team exists
    if (!roster.teams || !roster.teams[teamIndex]) {
      console.error("❌ Team not found at index:", teamIndex);
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    console.log("✅ Found team:", roster.teams[teamIndex].name);

    // Initialize staff array if it doesn't exist
    if (!roster.teams[teamIndex].staff) {
      console.log("⚠️ Staff array doesn't exist, will be created");
    }

    // Create new staff member
    const newStaff = {
      id: `staff-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      role,
      memberId,
      memberName,
      qualifications: qualifications || [],
      startDate: new Date().toISOString(),
      endDate: null,
      addedBy: "admin-temp",
      addedDate: new Date().toISOString(),
    };

    console.log("📄 New staff object:", JSON.stringify(newStaff, null, 2));

    // Update roster - add staff to team
    const updatePath = `teams.${teamIndex}.staff`;
    const result = await db.collection("teamRosters").updateOne(
      { id: rosterId },
      {
        $push: { [updatePath]: newStaff },
        $set: { lastUpdated: new Date().toISOString() },
      },
    );

    console.log("📊 Update result:");
    console.log("  Matched:", result.matchedCount);
    console.log("  Modified:", result.modifiedCount);

    if (result.matchedCount === 0) {
      console.error("❌ No roster matched for update");
      return NextResponse.json({ error: "Roster not found" }, { status: 404 });
    }

    if (result.modifiedCount === 0) {
      console.error("❌ Roster matched but not modified");
      return NextResponse.json(
        { error: "Failed to add staff - no changes made" },
        { status: 500 },
      );
    }

    console.log(
      `✅ Successfully added ${role} ${memberName} to team ${roster.teams[teamIndex].name}\n`,
    );

    return NextResponse.json({
      success: true,
      staff: newStaff,
    });
  } catch (error: any) {
    console.error("❌ Error adding staff:", error);
    console.error("Stack:", error.stack);
    return NextResponse.json(
      {
        error: "Failed to add staff",
        details: error.message,
        stack: error.stack,
      },
      { status: 500 },
    );
  }
}
