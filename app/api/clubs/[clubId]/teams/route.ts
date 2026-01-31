// app/api/clubs/[clubId]/teams/route.ts
// GET - List all teams for a club
// POST - Create a new team

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import {
  TeamSchema,
  CreateTeamRequestSchema,
  generateTeamId,
  generateDisplayName,
  calculateTeamStatistics,
  type Team,
} from "@/lib/db/schemas/team.schema";

// ============================================================================
// GET /api/clubs/[clubId]/teams
// List all teams for a club with optional filtering
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clubId: string }> }
) {
  try {
    const { clubId } = await params;
    const { searchParams } = new URL(request.url);

    // Optional filters
    const ageCategory = searchParams.get("ageCategory");
    const season = searchParams.get("season");
    const status = searchParams.get("status") || "active";

    const client = await clientPromise;
    const db = client.db();

    // First, get the club to verify it exists and get the name
    const club = await db.collection("clubs").findOne({
      $or: [{ id: clubId }, { slug: clubId }],
    });

    if (!club) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    // Build query
    const query: any = { clubId: club.id };

    if (ageCategory) {
      query.ageCategory = ageCategory;
    }

    if (season) {
      query.season = season;
    }

    if (status !== "all") {
      query.status = status;
    }

    // Fetch teams
    const teams = await db
      .collection("teams")
      .find(query)
      .sort({
        ageCategory: 1, // junior, senior, masters
        "division.level": 1, // 1, 2, 3...
      })
      .toArray();

    // Transform MongoDB _id to string
    const teamsWithId = teams.map((team) => ({
      ...team,
      _id: team._id.toString(),
    }));

    return NextResponse.json(teamsWithId);
  } catch (error: any) {
    console.error("Error fetching teams:", error);
    return NextResponse.json(
      { error: "Failed to fetch teams", details: error.message },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST /api/clubs/[clubId]/teams
// Create a new team
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ clubId: string }> }
) {
  try {
    const { clubId } = await params;
    const body = await request.json();

    // Validate request body
    const validatedData = CreateTeamRequestSchema.parse(body);

    const client = await clientPromise;
    const db = client.db();

    // Get club details
    const club = await db.collection("clubs").findOne({
      $or: [{ id: clubId }, { slug: clubId }],
    });

    if (!club) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    // Generate team ID
    const teamId = generateTeamId(
      club.slug || club.id,
      validatedData.division.shortName,
      validatedData.season
    );

    // Check if team already exists
    const existingTeam = await db.collection("teams").findOne({ teamId });
    if (existingTeam) {
      return NextResponse.json(
        { error: "Team with this ID already exists" },
        { status: 409 }
      );
    }

    // Generate display name
    const displayName = generateDisplayName(club.name, validatedData.name);

    // Create team document
    const newTeam: Team = {
      teamId,
      clubId: club.id,
      name: validatedData.name,
      displayName,
      gender: validatedData.gender,
      ageCategory: validatedData.ageCategory,
      division: validatedData.division,
      roster: [],
      leadership: {
        viceCaptains: [],
      },
      season: validatedData.season,
      competition: validatedData.competition,
      grade: validatedData.grade,
      homeGround: validatedData.homeGround,
      status: "active",
      statistics: {
        totalRegistered: 0,
        totalAssigned: 0,
        totalGoalkeepers: 0,
        activeMembers: 0,
        inactiveMembers: 0,
        injuredMembers: 0,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Validate the complete team document
    const validatedTeam = TeamSchema.parse(newTeam);

    // Insert into database
    const result = await db.collection("teams").insertOne(validatedTeam);

    // Fetch the created team
    const createdTeam = await db
      .collection("teams")
      .findOne({ _id: result.insertedId });

    if (!createdTeam) {
      return NextResponse.json(
        { error: "Failed to retrieve created team" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        ...createdTeam,
        _id: createdTeam._id.toString(),
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating team:", error);

    // Zod validation errors
    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create team", details: error.message },
      { status: 500 }
    );
  }
}
