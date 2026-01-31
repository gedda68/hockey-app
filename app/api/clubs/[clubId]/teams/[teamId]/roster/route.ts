// app/api/clubs/[clubId]/teams/[teamId]/roster/route.ts
// POST - Add member to team roster

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import {
  AddRosterMemberRequestSchema,
  calculateTeamStatistics,
  validateTeamLimits,
  type TeamRosterMember,
  type MemberTeamRegistration,
} from "@/lib/db/schemas/team.schema";

// ============================================================================
// POST /api/clubs/[clubId]/teams/[teamId]/roster
// Add a member to the team roster
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ clubId: string; teamId: string }> }
) {
  try {
    const { clubId, teamId } = await params;
    const body = await request.json();

    // Validate request body
    const validatedData = AddRosterMemberRequestSchema.parse(body);

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

    // Fetch member
    const member = await db.collection("members").findOne({
      memberId: validatedData.memberId,
      clubId: club.id,
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Check if member already in roster
    const existingRosterMember = team.roster?.find(
      (r: any) => r.memberId === validatedData.memberId
    );

    if (existingRosterMember) {
      return NextResponse.json(
        { error: "Member is already in this team roster" },
        { status: 409 }
      );
    }

    // Fetch role to get category
    const role = await db.collection("club-roles").findOne({
      id: validatedData.roleId,
    });

    if (!role) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    // Validate role category for team membership
    const allowedCategories = [
      "Participant",
      "Playing",
      "Official",
      "Coaching",
    ];
    if (!allowedCategories.includes(role.category)) {
      return NextResponse.json(
        {
          error: `Only ${allowedCategories.join(
            ", "
          )} roles can be added to teams`,
          roleCategory: role.category,
        },
        { status: 400 }
      );
    }

    // Create roster member object
    const newRosterMember: TeamRosterMember = {
      memberId: validatedData.memberId,
      roleId: validatedData.roleId,
      roleCategory: role.category,
      registrationType: validatedData.registrationType,
      position: validatedData.position,
      jerseyNumber: validatedData.jerseyNumber,
      status: validatedData.status || "active",
      joinedDate: new Date(),
      notes: "",
    };

    // Calculate what statistics would be after adding this member
    const updatedRoster = [...(team.roster || []), newRosterMember];
    const newStatistics = calculateTeamStatistics(updatedRoster);

    // Validate team limits (only for registered players)
    if (validatedData.registrationType === "registered") {
      const validation = validateTeamLimits(newStatistics);

      if (!validation.valid) {
        return NextResponse.json(
          {
            error: "Team limits exceeded",
            details: validation.errors,
            currentStatistics: team.statistics,
          },
          { status: 400 }
        );
      }

      // Check age category conflicts (only for registered players)
      const existingRegistrations = member.teamRegistrations || [];

      // Same club, same age category check
      const sameClubSameCategory = existingRegistrations.find(
        (reg: any) =>
          reg.clubId === club.id &&
          reg.ageCategory === team.ageCategory &&
          reg.status === "active" &&
          reg.registrationType === "registered"
      );

      if (sameClubSameCategory) {
        return NextResponse.json(
          {
            error: `Member is already registered in another ${team.ageCategory} team at this club`,
            conflictingTeam: sameClubSameCategory.teamName,
          },
          { status: 409 }
        );
      }

      // Different club, same age category check
      const otherClubSameCategory = existingRegistrations.find(
        (reg: any) =>
          reg.clubId !== club.id &&
          reg.ageCategory === team.ageCategory &&
          reg.status === "active" &&
          reg.registrationType === "registered"
      );

      if (otherClubSameCategory) {
        return NextResponse.json(
          {
            error: `Member is already registered in a ${team.ageCategory} team at another club`,
            conflictingTeam: otherClubSameCategory.teamName,
          },
          { status: 409 }
        );
      }
    }

    // Create member team registration object
    const memberRegistration: MemberTeamRegistration = {
      teamId: team.teamId,
      clubId: club.id,
      teamName: team.name,
      ageCategory: team.ageCategory,
      divisionLevel: team.division.level,
      roleId: validatedData.roleId,
      registrationType: validatedData.registrationType,
      position: validatedData.position,
      jerseyNumber: validatedData.jerseyNumber,
      isCaptain: false,
      isViceCaptain: false,
      status: validatedData.status || "active",
      season: team.season,
      joinedDate: new Date(),
    };

    // Start transaction
    const session = client.startSession();

    try {
      await session.withTransaction(async () => {
        // Update team roster and statistics
        await db.collection("teams").updateOne(
          { teamId, clubId: club.id },
          {
            $push: { roster: newRosterMember } as any,
            $set: {
              statistics: newStatistics,
              updatedAt: new Date(),
            },
          },
          { session }
        );

        // Update member's team registrations
        await db.collection("members").updateOne(
          { memberId: validatedData.memberId, clubId: club.id },
          {
            $push: { teamRegistrations: memberRegistration } as any,
            $set: { updatedAt: new Date() },
          },
          { session }
        );
      });

      return NextResponse.json(
        {
          message: "Member added to roster successfully",
          rosterMember: newRosterMember,
          statistics: newStatistics,
          warnings: validateTeamLimits(newStatistics).warnings,
        },
        { status: 201 }
      );
    } finally {
      await session.endSession();
    }
  } catch (error: any) {
    console.error("Error adding member to roster:", error);

    // Zod validation errors
    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to add member to roster", details: error.message },
      { status: 500 }
    );
  }
}
