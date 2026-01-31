// app/api/clubs/[clubId]/teams/[teamId]/route.ts
// GET - Get team details
// PUT - Update team
// DELETE - Delete team

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import {
  TeamSchema,
  UpdateTeamRequestSchema,
  calculateTeamStatistics,
  type Team,
} from "@/lib/db/schemas/team.schema";

// ============================================================================
// GET /api/clubs/[clubId]/teams/[teamId]
// Get team details with member information
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clubId: string; teamId: string }> }
) {
  try {
    const { clubId, teamId } = await params;

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

    // Optionally, enrich with member details
    const includeMembers =
      new URL(request.url).searchParams.get("includeMembers") === "true";

    if (includeMembers && team.roster && team.roster.length > 0) {
      const memberIds = team.roster.map((r: any) => r.memberId);

      const members = await db
        .collection("members")
        .find({
          memberId: { $in: memberIds },
          clubId: club.id,
        })
        .project({
          memberId: 1,
          "personalInfo.firstName": 1,
          "personalInfo.lastName": 1,
          "personalInfo.displayName": 1,
          "personalInfo.photoUrl": 1,
          "contact.primaryEmail": 1,
        })
        .toArray();

      // Create a map for quick lookup
      const memberMap = new Map(members.map((m) => [m.memberId, m]));

      // Enrich roster with member details
      const enrichedRoster = team.roster.map((rosterMember: any) => {
        const member = memberMap.get(rosterMember.memberId);
        return {
          ...rosterMember,
          memberDetails: member
            ? {
                firstName: member.personalInfo?.firstName,
                lastName: member.personalInfo?.lastName,
                displayName: member.personalInfo?.displayName,
                photoUrl: member.personalInfo?.photoUrl,
                email: member.contact?.primaryEmail,
              }
            : null,
        };
      });

      return NextResponse.json({
        ...team,
        _id: team._id.toString(),
        roster: enrichedRoster,
      });
    }

    return NextResponse.json({
      ...team,
      _id: team._id.toString(),
    });
  } catch (error: any) {
    console.error("Error fetching team:", error);
    return NextResponse.json(
      { error: "Failed to fetch team", details: error.message },
      { status: 500 }
    );
  }
}

// ============================================================================
// PUT /api/clubs/[clubId]/teams/[teamId]
// Update team information (not roster)
// ============================================================================

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ clubId: string; teamId: string }> }
) {
  try {
    const { clubId, teamId } = await params;
    const body = await request.json();

    // Validate request body
    const validatedData = UpdateTeamRequestSchema.parse(body);

    const client = await clientPromise;
    const db = client.db();

    // Verify club exists
    const club = await db.collection("clubs").findOne({
      $or: [{ id: clubId }, { slug: clubId }],
    });

    if (!club) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    // Check if team exists
    const existingTeam = await db.collection("teams").findOne({
      teamId,
      clubId: club.id,
    });

    if (!existingTeam) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    // Build update object
    const updateData: any = {
      updatedAt: new Date(),
    };

    // Only include fields that were provided
    if (validatedData.name !== undefined) updateData.name = validatedData.name;
    if (validatedData.gender !== undefined)
      updateData.gender = validatedData.gender;
    if (validatedData.division !== undefined)
      updateData.division = validatedData.division;
    if (validatedData.season !== undefined)
      updateData.season = validatedData.season;
    if (validatedData.competition !== undefined)
      updateData.competition = validatedData.competition;
    if (validatedData.grade !== undefined)
      updateData.grade = validatedData.grade;
    if (validatedData.homeGround !== undefined)
      updateData.homeGround = validatedData.homeGround;
    if (validatedData.trainingVenue !== undefined)
      updateData.trainingVenue = validatedData.trainingVenue;
    if (validatedData.trainingTimes !== undefined)
      updateData.trainingTimes = validatedData.trainingTimes;
    if (validatedData.status !== undefined)
      updateData.status = validatedData.status;

    // If name changed, update displayName
    if (validatedData.name) {
      updateData.displayName = `${club.name} - ${validatedData.name}`;
    }

    // Update team
    const result = await db
      .collection("teams")
      .findOneAndUpdate(
        { teamId, clubId: club.id },
        { $set: updateData },
        { returnDocument: "after" }
      );

    if (!result) {
      return NextResponse.json(
        { error: "Failed to update team" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ...result,
      _id: result._id.toString(),
    });
  } catch (error: any) {
    console.error("Error updating team:", error);

    // Zod validation errors
    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update team", details: error.message },
      { status: 500 }
    );
  }
}

// ============================================================================
// DELETE /api/clubs/[clubId]/teams/[teamId]
// Delete a team (also removes from member registrations)
// ============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ clubId: string; teamId: string }> }
) {
  try {
    const { clubId, teamId } = await params;

    const client = await clientPromise;
    const db = client.db();

    // Verify club exists
    const club = await db.collection("clubs").findOne({
      $or: [{ id: clubId }, { slug: clubId }],
    });

    if (!club) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    // Check if team exists
    const team = await db.collection("teams").findOne({
      teamId,
      clubId: club.id,
    });

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    // Get all member IDs from roster
    const memberIds = team.roster?.map((r: any) => r.memberId) || [];

    // Start a transaction to ensure consistency
    const session = client.startSession();

    try {
      await session.withTransaction(async () => {
        // Delete the team
        await db
          .collection("teams")
          .deleteOne({ teamId, clubId: club.id }, { session });

        // Remove team registrations from all members
        if (memberIds.length > 0) {
          await db.collection("members").updateMany(
            {
              memberId: { $in: memberIds },
              clubId: club.id,
            },
            {
              $pull: {
                teamRegistrations: { teamId },
              } as any,
            },
            { session }
          );
        }
      });

      return NextResponse.json(
        {
          message: "Team deleted successfully",
          deletedTeamId: teamId,
          updatedMembers: memberIds.length,
        },
        { status: 200 }
      );
    } finally {
      await session.endSession();
    }
  } catch (error: any) {
    console.error("Error deleting team:", error);
    return NextResponse.json(
      { error: "Failed to delete team", details: error.message },
      { status: 500 }
    );
  }
}
