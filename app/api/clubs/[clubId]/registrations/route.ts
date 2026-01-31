// app/api/clubs/[clubId]/registrations/route.ts
// GET - List pending registrations
// app/api/clubs/[clubId]/registrations/[registrationId]/approve/route.ts
// POST - Approve registration
// app/api/clubs/[clubId]/registrations/[registrationId]/reject/route.ts
// POST - Reject registration

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import {
  // ApproveRegistrationRequestSchema,
  // RejectRegistrationRequestSchema,
  validateApproval,
  validateRejection,
} from "@/lib/validation/club-registration-validation";

// ============================================================================
// GET /api/clubs/[clubId]/registrations
// List club registrations (with filters)
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clubId: string }> }
) {
  try {
    const { clubId } = await params;
    const { searchParams } = new URL(request.url);

    const status = searchParams.get("status") || "pending";
    const registrationType = searchParams.get("registrationType");

    const client = await clientPromise;
    const db = client.db();

    // Verify club exists
    const club = await db.collection("clubs").findOne({
      $or: [{ id: clubId }, { slug: clubId }],
    });

    if (!club) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    // Build query
    const query: any = { clubId: club.id };

    if (status !== "all") {
      query.status = status;
    }

    if (registrationType) {
      query.registrationType = registrationType;
    }

    // Fetch registrations
    const registrations = await db
      .collection("club-registrations")
      .find(query)
      .sort({ registeredDate: -1 })
      .toArray();

    // Enrich with member details
    const memberIds = registrations.map((r: any) => r.memberId);
    const members = await db
      .collection("members")
      .find({ memberId: { $in: memberIds } })
      .project({
        memberId: 1,
        "personalInfo.firstName": 1,
        "personalInfo.lastName": 1,
        "personalInfo.displayName": 1,
        "personalInfo.photoUrl": 1,
        "contact.primaryEmail": 1,
      })
      .toArray();

    const memberMap = new Map(members.map((m) => [m.memberId, m]));

    // Add member details
    const enrichedRegistrations = registrations.map((reg: any) => {
      const member = memberMap.get(reg.memberId);
      return {
        ...reg,
        _id: reg._id.toString(),
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

    return NextResponse.json(enrichedRegistrations);
  } catch (error: any) {
    console.error("Error fetching registrations:", error);
    return NextResponse.json(
      { error: "Failed to fetch registrations", details: error.message },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST /api/clubs/[clubId]/registrations/[registrationId]/approve
// Approve a pending registration
// ============================================================================

export async function approveRegistration(
  request: NextRequest,
  { params }: { params: Promise<{ clubId: string; registrationId: string }> }
) {
  try {
    const { clubId, registrationId } = await params;
    const body = await request.json();

    // Validate request
    // const validatedData = ApproveRegistrationRequestSchema.parse(body);

    const client = await clientPromise;
    const db = client.db();

    // Verify club exists
    const club = await db.collection("clubs").findOne({
      $or: [{ id: clubId }, { slug: clubId }],
    });

    if (!club) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    // Fetch registration
    const registration = await db.collection("club-registrations").findOne({
      registrationId,
      clubId: club.id,
    });

    if (!registration) {
      return NextResponse.json(
        { error: "Registration not found" },
        { status: 404 }
      );
    }

    // Validate can approve
    const validation = validateApproval(registration as any);
    if (!validation.canApprove) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Get admin ID from session/auth
    const adminId = body.adminId || "system"; // TODO: Get from auth

    // Prepare update
    const updateData: any = {
      status: "active",
      approvedDate: new Date(),
      approvedBy: adminId,
      updatedAt: new Date(),
    };

    // if (validatedData.membershipType) {
    //   updateData.membershipType = validatedData.membershipType;
    // }

    // if (validatedData.registrationFee !== undefined) {
    //   updateData.registrationFee = validatedData.registrationFee;
    // }

    // if (validatedData.expiryDate) {
    //   updateData.expiryDate = new Date(validatedData.expiryDate);
    // }

    // if (validatedData.notes) {
    //   updateData.registrationNotes = validatedData.notes;
    // }

    // Start transaction
    const session = client.startSession();

    try {
      await session.withTransaction(async () => {
        // Update registration
        await db
          .collection("club-registrations")
          .updateOne(
            { registrationId, clubId: club.id },
            { $set: updateData },
            { session }
          );

        // Update member's clubRegistrations array
        await db.collection("members").updateOne(
          {
            memberId: registration.memberId,
            "clubRegistrations.registrationId": registrationId,
          },
          {
            $set: {
              "clubRegistrations.$.status": "active",
              updatedAt: new Date(),
            },
          },
          { session }
        );

        // If this is primary club, set clubId on member
        if (registration.registrationType === "primary") {
          await db.collection("members").updateOne(
            { memberId: registration.memberId },
            {
              $set: {
                clubId: club.id,
                "membership.status": "Active",
                updatedAt: new Date(),
              },
            },
            { session }
          );
        }
      });

      return NextResponse.json({
        message: "Registration approved successfully",
        registration: {
          registrationId,
          status: "active",
          approvedDate: new Date(),
        },
      });
    } finally {
      await session.endSession();
    }
  } catch (error: any) {
    console.error("Error approving registration:", error);

    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to approve registration", details: error.message },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST /api/clubs/[clubId]/registrations/[registrationId]/reject
// Reject a pending registration
// ============================================================================

export async function rejectRegistration(
  request: NextRequest,
  { params }: { params: Promise<{ clubId: string; registrationId: string }> }
) {
  try {
    const { clubId, registrationId } = await params;
    const body = await request.json();

    // Validate request
    //  const validatedData = RejectRegistrationRequestSchema.parse(body);

    const client = await clientPromise;
    const db = client.db();

    // Verify club exists
    const club = await db.collection("clubs").findOne({
      $or: [{ id: clubId }, { slug: clubId }],
    });

    if (!club) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    // Fetch registration
    const registration = await db.collection("club-registrations").findOne({
      registrationId,
      clubId: club.id,
    });

    if (!registration) {
      return NextResponse.json(
        { error: "Registration not found" },
        { status: 404 }
      );
    }

    // Validate can reject
    const validation = validateRejection(registration as any);
    if (!validation.canReject) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Start transaction
    const session = client.startSession();

    try {
      await session.withTransaction(async () => {
        // Update registration
        await db.collection("club-registrations").updateOne(
          { registrationId, clubId: club.id },
          {
            $set: {
              status: "rejected",
              //           rejectionReason: validatedData.rejectionReason,
              updatedAt: new Date(),
            },
          },
          { session }
        );

        // Update member's clubRegistrations array
        await db.collection("members").updateOne(
          {
            memberId: registration.memberId,
            "clubRegistrations.registrationId": registrationId,
          },
          {
            $set: {
              "clubRegistrations.$.status": "rejected",
              updatedAt: new Date(),
            },
          },
          { session }
        );
      });

      return NextResponse.json({
        message: "Registration rejected",
        registration: {
          registrationId,
          status: "rejected",
          //     rejectionReason: validatedData.rejectionReason,
        },
      });
    } finally {
      await session.endSession();
    }
  } catch (error: any) {
    console.error("Error rejecting registration:", error);

    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to reject registration", details: error.message },
      { status: 500 }
    );
  }
}
