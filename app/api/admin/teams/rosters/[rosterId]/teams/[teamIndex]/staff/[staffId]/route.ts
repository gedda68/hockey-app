// app/api/admin/teams/rosters/[rosterId]/teams/[teamIndex]/staff/[staffId]/route.ts
// FIXED: Hard delete - actually remove staff from array

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

// UPDATE staff member
export async function PATCH(
  request: NextRequest,
  context: {
    params: Promise<{ rosterId: string; teamIndex: string; staffId: string }>;
  },
) {
  try {
    const { rosterId, teamIndex: teamIndexStr, staffId } = await context.params;
    const teamIndex = parseInt(teamIndexStr);
    const body = await request.json();

    console.log("\n=== UPDATE STAFF API ===");
    console.log("📋 Roster ID:", rosterId);
    console.log("📋 Team Index:", teamIndex);
    console.log("📋 Staff ID:", staffId);
    console.log("📦 Body:", JSON.stringify(body, null, 2));

    const client = await clientPromise;
    const db = client.db();

    const roster = await db.collection("teamRosters").findOne({ id: rosterId });
    if (!roster) {
      return NextResponse.json({ error: "Roster not found" }, { status: 404 });
    }

    if (!roster.teams || !roster.teams[teamIndex]) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    // Find staff index
    const staffIndex = roster.teams[teamIndex].staff?.findIndex(
      (s: any) => s.id === staffId,
    );

    if (staffIndex === -1 || staffIndex === undefined) {
      return NextResponse.json(
        { error: "Staff member not found" },
        { status: 404 },
      );
    }

    // Update staff fields
    const updatePath = `teams.${teamIndex}.staff.${staffIndex}`;
    const updates: any = {};

    if (body.role) updates[`${updatePath}.role`] = body.role;
    if (body.memberId) updates[`${updatePath}.memberId`] = body.memberId;
    if (body.memberName) updates[`${updatePath}.memberName`] = body.memberName;
    if (body.qualifications !== undefined)
      updates[`${updatePath}.qualifications`] = body.qualifications;

    const result = await db.collection("teamRosters").updateOne(
      { id: rosterId },
      {
        $set: {
          ...updates,
          lastUpdated: new Date().toISOString(),
        },
      },
    );

    console.log(`✅ Updated staff member ${body.memberName || staffId}\n`);

    return NextResponse.json({
      success: true,
      modified: result.modifiedCount > 0,
    });
  } catch (error: any) {
    console.error("❌ Error updating staff:", error);
    return NextResponse.json(
      { error: "Failed to update staff", details: error.message },
      { status: 500 },
    );
  }
}

// DELETE staff member - HARD DELETE (actually remove from array)
export async function DELETE(
  request: NextRequest,
  context: {
    params: Promise<{ rosterId: string; teamIndex: string; staffId: string }>;
  },
) {
  try {
    const { rosterId, teamIndex: teamIndexStr, staffId } = await context.params;
    const teamIndex = parseInt(teamIndexStr);

    console.log("\n=== DELETE STAFF API ===");
    console.log("📋 Roster ID:", rosterId);
    console.log("📋 Team Index:", teamIndex);
    console.log("📋 Staff ID:", staffId);

    const client = await clientPromise;
    const db = client.db();

    const roster = await db.collection("teamRosters").findOne({ id: rosterId });
    if (!roster) {
      console.error("❌ Roster not found:", rosterId);
      return NextResponse.json({ error: "Roster not found" }, { status: 404 });
    }

    console.log("✅ Found roster:", roster.clubName);

    if (!roster.teams || !roster.teams[teamIndex]) {
      console.error("❌ Team not found at index:", teamIndex);
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    console.log("✅ Found team:", roster.teams[teamIndex].name);

    // Check if staff exists
    const staffMember = roster.teams[teamIndex].staff?.find(
      (s: any) => s.id === staffId,
    );

    if (!staffMember) {
      console.error("❌ Staff member not found:", staffId);
      return NextResponse.json(
        { error: "Staff member not found" },
        { status: 404 },
      );
    }

    console.log("✅ Found staff member:", staffMember.memberName);

    // HARD DELETE - Remove from array using $pull
    const result = await db.collection("teamRosters").updateOne(
      { id: rosterId },
      {
        $pull: {
          [`teams.${teamIndex}.staff`]: { id: staffId },
        },
        $set: {
          lastUpdated: new Date().toISOString(),
        },
      },
    );

    console.log("📊 Delete result:");
    console.log("  Matched:", result.matchedCount);
    console.log("  Modified:", result.modifiedCount);

    if (result.modifiedCount === 0) {
      console.error("❌ Staff not removed - no changes made");
      return NextResponse.json(
        { error: "Failed to remove staff" },
        { status: 500 },
      );
    }

    console.log(
      `✅ Successfully removed ${staffMember.memberName} from team ${roster.teams[teamIndex].name}\n`,
    );

    return NextResponse.json({
      success: true,
      removed: true,
    });
  } catch (error: any) {
    console.error("❌ Error deleting staff:", error);
    console.error("Stack:", error.stack);
    return NextResponse.json(
      { error: "Failed to delete staff", details: error.message },
      { status: 500 },
    );
  }
}
