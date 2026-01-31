// app/api/clubs/[clubId]/teams/[teamId]/leadership/route.ts
// PUT - Update team leadership (captain and vice captains)

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { UpdateLeadershipRequestSchema } from "@/lib/db/schemas/team.schema";

// ============================================================================
// PUT /api/clubs/[clubId]/teams/[teamId]/leadership
// Update team captain and vice captains
// ============================================================================

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ clubId: string; teamId: string }> }
) {
  try {
    const { clubId, teamId } = await params;
    const body = await request.json();

    // Validate request body
    const validatedData = UpdateLeadershipRequestSchema.parse(body);

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

    // Get roster member IDs for validation
    const rosterMemberIds = team.roster?.map((r: any) => r.memberId) || [];

    // Validate captain is in roster
    if (
      validatedData.captain &&
      !rosterMemberIds.includes(validatedData.captain)
    ) {
      return NextResponse.json(
        { error: "Captain must be a member of the team roster" },
        { status: 400 }
      );
    }

    // Validate vice captains are in roster
    if (validatedData.viceCaptains) {
      for (const vc of validatedData.viceCaptains) {
        if (!rosterMemberIds.includes(vc)) {
          return NextResponse.json(
            { error: `Vice captain ${vc} must be a member of the team roster` },
            { status: 400 }
          );
        }
      }

      // Check max 2 vice captains
      if (validatedData.viceCaptains.length > 2) {
        return NextResponse.json(
          { error: "Maximum 2 vice captains allowed" },
          { status: 400 }
        );
      }
    }

    // Get current leadership for comparison
    const currentCaptain = team.leadership?.captain;
    const currentViceCaptains = team.leadership?.viceCaptains || [];

    // Build update object
    const updateFields: any = {
      updatedAt: new Date(),
    };

    if (validatedData.captain !== undefined) {
      updateFields["leadership.captain"] = validatedData.captain;
    }

    if (validatedData.viceCaptains !== undefined) {
      updateFields["leadership.viceCaptains"] = validatedData.viceCaptains;
    }

    // Start transaction
    const session = client.startSession();

    try {
      await session.withTransaction(async () => {
        // Update team leadership
        await db
          .collection("teams")
          .updateOne(
            { teamId, clubId: club.id },
            { $set: updateFields },
            { session }
          );

        // Update member registrations - remove old leadership flags
        const membersToUpdate = [
          currentCaptain,
          ...currentViceCaptains,
          validatedData.captain,
          ...(validatedData.viceCaptains || []),
        ].filter(Boolean);

        // Reset all leadership flags for affected members
        for (const memberId of membersToUpdate) {
          await db.collection("members").updateOne(
            {
              memberId,
              clubId: club.id,
              "teamRegistrations.teamId": teamId,
            },
            {
              $set: {
                "teamRegistrations.$.isCaptain": false,
                "teamRegistrations.$.isViceCaptain": false,
                updatedAt: new Date(),
              },
            },
            { session }
          );
        }

        // Set new captain flag
        if (validatedData.captain) {
          await db.collection("members").updateOne(
            {
              memberId: validatedData.captain,
              clubId: club.id,
              "teamRegistrations.teamId": teamId,
            },
            {
              $set: {
                "teamRegistrations.$.isCaptain": true,
                updatedAt: new Date(),
              },
            },
            { session }
          );
        }

        // Set new vice captain flags
        if (validatedData.viceCaptains) {
          for (const vc of validatedData.viceCaptains) {
            await db.collection("members").updateOne(
              {
                memberId: vc,
                clubId: club.id,
                "teamRegistrations.teamId": teamId,
              },
              {
                $set: {
                  "teamRegistrations.$.isViceCaptain": true,
                  updatedAt: new Date(),
                },
              },
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
        message: "Leadership updated successfully",
        leadership: updatedTeam?.leadership,
        team: {
          ...updatedTeam,
          _id: updatedTeam?._id.toString(),
        },
      });
    } finally {
      await session.endSession();
    }
  } catch (error: any) {
    console.error("Error updating leadership:", error);

    // Zod validation errors
    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update leadership", details: error.message },
      { status: 500 }
    );
  }
}
