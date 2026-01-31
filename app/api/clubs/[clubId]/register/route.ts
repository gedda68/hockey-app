// app/api/clubs/[clubId]/register/route.ts
// POST - Register member for club

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import {
  RegisterForClubRequestSchema,
  generateRegistrationId,
  validateClubRegistration,
  type ClubRegistration,
} from "@/lib/validation/club-registration-validation";

// ============================================================================
// POST /api/clubs/[clubId]/register
// Register a member for a club (primary or secondary)
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ clubId: string }> }
) {
  try {
    const { clubId } = await params;
    const body = await request.json();

    // Validate request body
    const validatedData = RegisterForClubRequestSchema.parse(body);

    const client = await clientPromise;
    const db = client.db();

    // Verify club exists
    const club = await db.collection("clubs").findOne({
      $or: [{ id: clubId }, { slug: clubId }],
    });

    if (!club) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    // Get member ID from session/auth
    // For now, accepting from request body
    const { memberId } = body;

    if (!memberId) {
      return NextResponse.json(
        { error: "Member ID required" },
        { status: 400 }
      );
    }

    // Verify member exists
    const member = await db.collection("members").findOne({
      memberId,
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Get existing club registrations
    const existingRegistrations = await db
      .collection("club-registrations")
      .find({ memberId })
      .toArray();

    // Validate registration
    const validation = validateClubRegistration({
      memberId,
      clubId: club.id,
      registrationType: validatedData.registrationType,
      existingRegistrations: existingRegistrations as any[],
    });

    if (!validation.canRegister) {
      return NextResponse.json(
        {
          error: "Cannot register for club",
          details: validation.errors,
          warnings: validation.warnings,
        },
        { status: 400 }
      );
    }

    // Generate registration ID
    const registrationId = generateRegistrationId(
      club.id,
      memberId,
      validatedData.registrationType
    );

    // Create registration document
    const registration: ClubRegistration = {
      registrationId,
      memberId,
      clubId: club.id,
      registrationType: validatedData.registrationType,
      status: "pending", // Requires approval
      registeredDate: new Date(),
      roleIds: validatedData.roleIds,
      membershipType: validatedData.membershipType,
      registrationNotes: validatedData.registrationNotes,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Insert registration
    await db.collection("club-registrations").insertOne(registration);

    // Add to member's clubRegistrations array
    await db.collection("members").updateOne(
      { memberId },
      {
        $push: {
          clubRegistrations: {
            clubId: club.id,
            clubName: club.name,
            registrationId,
            registrationType: validatedData.registrationType,
            status: "pending",
            registeredDate: new Date(),
          },
        } as any,
        $set: { updatedAt: new Date() },
      }
    );

    return NextResponse.json(
      {
        message: "Registration submitted successfully",
        registration: {
          registrationId,
          status: "pending",
          registrationType: validatedData.registrationType,
          clubId: club.id,
          clubName: club.name,
        },
        warnings: validation.warnings,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error registering for club:", error);

    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to register for club", details: error.message },
      { status: 500 }
    );
  }
}
