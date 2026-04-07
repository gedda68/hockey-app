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


    const client = await clientPromise;
    const db = client.db("hockey-app");

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
    const updates: Record<string, unknown> = {};

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


    return NextResponse.json({
      success: true,
      modified: result.modifiedCount > 0,
    });
  } catch (error: unknown) {
    console.error("❌ Error updating staff:", error);
    return NextResponse.json(
      {
        error: "Failed to update staff",
        details: error instanceof Error ? error.message : String(error),
      },
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


    const client = await clientPromise;
    const db = client.db("hockey-app");

    const roster = await db.collection("teamRosters").findOne({ id: rosterId });
    if (!roster) {
      console.error("❌ Roster not found:", rosterId);
      return NextResponse.json({ error: "Roster not found" }, { status: 404 });
    }


    if (!roster.teams || !roster.teams[teamIndex]) {
      console.error("❌ Team not found at index:", teamIndex);
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }


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
      } as unknown as import("mongodb").UpdateFilter<import("mongodb").Document>,
    );


    if (result.modifiedCount === 0) {
      console.error("❌ Staff not removed - no changes made");
      return NextResponse.json(
        { error: "Failed to remove staff" },
        { status: 500 },
      );
    }

    console.log(
      `✅ Successfully removed ${staffMember.memberName} from team ${roster.teams[teamIndex].name}`,
    );

    return NextResponse.json({
      success: true,
      removed: true,
    });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error("❌ Error deleting staff:", err);
    return NextResponse.json(
      { error: "Failed to delete staff", details: err.message },
      { status: 500 },
    );
  }
}
