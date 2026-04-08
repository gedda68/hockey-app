// app/api/admin/teams/rosters/[rosterId]/teams/[teamIndex]/staff/route.ts
// FIXED: Add staff with proper error handling and logging

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import {
  requirePermission,
  requireResourceAccess,
} from "@/lib/auth/middleware";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ rosterId: string; teamIndex: string }> },
) {
  try {
    const { rosterId, teamIndex: teamIndexStr } = await context.params;
    const teamIndex = parseInt(teamIndexStr);
    const body = await request.json();


    const { role, memberId, memberName, qualifications } = body;

    if (!role || !memberId) {
      console.error("❌ Missing required fields");
      return NextResponse.json(
        { error: "Role and member ID are required" },
        { status: 400 },
      );
    }

    const client = await clientPromise;
    const db = client.db("hockey-app");

    // Get roster
    const roster = await db.collection("teamRosters").findOne({ id: rosterId });
    if (!roster) {
      console.error("❌ Roster not found:", rosterId);
      return NextResponse.json({ error: "Roster not found" }, { status: 404 });
    }

    const { response: permRes } = await requirePermission(request, "team.edit");
    if (permRes) return permRes;
    if (roster.clubId) {
      const { response: scopeRes } = await requireResourceAccess(
        request,
        "club",
        String(roster.clubId),
      );
      if (scopeRes) return scopeRes;
    }

    // Check team exists
    if (!roster.teams || !roster.teams[teamIndex]) {
      console.error("❌ Team not found at index:", teamIndex);
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
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


    // Update roster - add staff to team
    const updatePath = `teams.${teamIndex}.staff`;
    const result = await db.collection("teamRosters").updateOne(
      { id: rosterId },
      {
        $push: { [updatePath]: newStaff },
        $set: { lastUpdated: new Date().toISOString() },
      } as unknown as import("mongodb").UpdateFilter<import("mongodb").Document>,
    );


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
      `✅ Successfully added ${role} ${memberName} to team ${roster.teams[teamIndex].name}`,
    );

    return NextResponse.json({
      success: true,
      staff: newStaff,
    });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error("❌ Error adding staff:", err);
    return NextResponse.json(
      {
        error: "Failed to add staff",
        details: err.message,
        stack: err.stack,
      },
      { status: 500 },
    );
  }
}
