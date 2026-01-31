// app/api/clubs/[clubId]/teams/[teamId]/roster/[memberId]/route.ts
// PUT - Update roster member
// DELETE - Remove member from roster

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import {
  UpdateRosterMemberRequestSchema,
  calculateTeamStatistics,
} from "@/lib/db/schemas/team.schema";

// ============================================================================
// PUT /api/clubs/[clubId]/teams/[teamId]/roster/[memberId]
// Update a roster member (position, jersey, status, notes)
// ============================================================================

export async function PUT(
  request: NextRequest,
  {
    params,
  }: { params: Promise<{ clubId: string; teamId: string; memberId: string }> }
) {
  try {
    const { clubId, teamId, memberId } = await params;
    const body = await request.json();

    // Validate request body
    const validatedData = UpdateRosterMemberRequestSchema.parse(body);

    const client = await clientPromise;
    const db = client.db();

    // Verify club exists
    const club = await db.collection("clubs").findOne({
      $or: [{ id: clubId }, { slug: clubId }],
    });

    if (!club) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    // Fetch team
    const team = await db.collection("teams").findOne({
      teamId,
      clubId: club.id,
    });

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    // Check if member is in roster
    const rosterIndex = team.roster?.findIndex(
      (r: any) => r.memberId === memberId
    );

    if (rosterIndex === -1 || rosterIndex === undefined) {
      return NextResponse.json(
        { error: "Member not found in team roster" },
        { status: 404 }
      );
    }

    // Build update object for array element
    const updateFields: any = {};

    if (validatedData.position !== undefined) {
      updateFields["roster.$.position"] = validatedData.position;
    }
    if (validatedData.jerseyNumber !== undefined) {
      updateFields["roster.$.jerseyNumber"] = validatedData.jerseyNumber;
    }
    if (validatedData.status !== undefined) {
      updateFields["roster.$.status"] = validatedData.status;
    }
    if (validatedData.notes !== undefined) {
      updateFields["roster.$.notes"] = validatedData.notes;
    }

    // Always update the team's updatedAt
    updateFields["updatedAt"] = new Date();

    // Start transaction
    const session = client.startSession();

    try {
      await session.withTransaction(async () => {
        // Update roster member in team
        await db.collection("teams").updateOne(
          {
            teamId,
            clubId: club.id,
            "roster.memberId": memberId,
          },
          { $set: updateFields },
          { session }
        );

        // Update corresponding fields in member's team registration
        const memberUpdateFields: any = {};
        if (validatedData.position !== undefined) {
          memberUpdateFields["teamRegistrations.$.position"] =
            validatedData.position;
        }
        if (validatedData.jerseyNumber !== undefined) {
          memberUpdateFields["teamRegistrations.$.jerseyNumber"] =
            validatedData.jerseyNumber;
        }
        if (validatedData.status !== undefined) {
          memberUpdateFields["teamRegistrations.$.status"] =
            validatedData.status;
        }
        memberUpdateFields["updatedAt"] = new Date();

        await db.collection("members").updateOne(
          {
            memberId,
            clubId: club.id,
            "teamRegistrations.teamId": teamId,
          },
          { $set: memberUpdateFields },
          { session }
        );

        // If status changed, recalculate statistics
        if (validatedData.status !== undefined) {
          const updatedTeam = await db
            .collection("teams")
            .findOne({ teamId, clubId: club.id }, { session });

          if (updatedTeam) {
            const newStatistics = calculateTeamStatistics(
              updatedTeam.roster || []
            );

            await db
              .collection("teams")
              .updateOne(
                { teamId, clubId: club.id },
                { $set: { statistics: newStatistics } },
                { session }
              );
          }
        }
      });

      // Fetch updated team
      const updatedTeam = await db.collection("teams").findOne({
        teamId,
        clubId: club.id,
      });

      return NextResponse.json({
        message: "Roster member updated successfully",
        team: {
          ...updatedTeam,
          _id: updatedTeam?._id.toString(),
        },
      });
    } finally {
      await session.endSession();
    }
  } catch (error: any) {
    console.error("Error updating roster member:", error);

    // Zod validation errors
    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update roster member", details: error.message },
      { status: 500 }
    );
  }
}

// ============================================================================
// DELETE /api/clubs/[clubId]/teams/[teamId]/roster/[memberId]
// Remove a member from the team roster
// ============================================================================

export async function DELETE(
  request: NextRequest,
  {
    params,
  }: { params: Promise<{ clubId: string; teamId: string; memberId: string }> }
) {
  try {
    const { clubId, teamId, memberId } = await params;

    const client = await clientPromise;
    const db = client.db();

    // Verify club exists
    const club = await db.collection("clubs").findOne({
      $or: [{ id: clubId }, { slug: clubId }],
    });

    if (!club) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    // Fetch team
    const team = await db.collection("teams").findOne({
      teamId,
      clubId: club.id,
    });

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    // Check if member is in roster
    const rosterMember = team.roster?.find((r: any) => r.memberId === memberId);

    if (!rosterMember) {
      return NextResponse.json(
        { error: "Member not found in team roster" },
        { status: 404 }
      );
    }

    // Check if member is captain or vice captain
    if (team.leadership?.captain === memberId) {
      return NextResponse.json(
        {
          error:
            "Cannot remove captain from roster. Please assign a new captain first.",
        },
        { status: 400 }
      );
    }

    if (team.leadership?.viceCaptains?.includes(memberId)) {
      return NextResponse.json(
        {
          error:
            "Cannot remove vice captain from roster. Please remove from leadership first.",
        },
        { status: 400 }
      );
    }

    // Start transaction
    const session = client.startSession();

    try {
      await session.withTransaction(async () => {
        // Remove from team roster
        await db.collection("teams").updateOne(
          { teamId, clubId: club.id },
          {
            $pull: { roster: { memberId } } as any,
            $set: { updatedAt: new Date() },
          },
          { session }
        );

        // Remove from member's team registrations
        await db.collection("members").updateOne(
          { memberId, clubId: club.id },
          {
            $pull: { teamRegistrations: { teamId } } as any,
            $set: { updatedAt: new Date() },
          },
          { session }
        );

        // Recalculate team statistics
        const updatedTeam = await db
          .collection("teams")
          .findOne({ teamId, clubId: club.id }, { session });

        if (updatedTeam) {
          const newStatistics = calculateTeamStatistics(
            updatedTeam.roster || []
          );

          await db
            .collection("teams")
            .updateOne(
              { teamId, clubId: club.id },
              { $set: { statistics: newStatistics } },
              { session }
            );
        }
      });

      return NextResponse.json({
        message: "Member removed from roster successfully",
        removedMemberId: memberId,
      });
    } finally {
      await session.endSession();
    }
  } catch (error: any) {
    console.error("Error removing roster member:", error);
    return NextResponse.json(
      { error: "Failed to remove roster member", details: error.message },
      { status: 500 }
    );
  }
}
