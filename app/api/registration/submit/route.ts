// app/api/registration/submit/route.ts
// Complete registration submission - creates member, associations, club, and payment

import { NextRequest, NextResponse } from "next/server";
import type { Db, Document, WithId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import type { FeeLineItem } from "@/types/registration";
import { sendEmail } from "@/lib/email/client";
import { buildRegistrationConfirmationEmail } from "@/lib/email/templates/registrationConfirmation";

// ============================================================================
// POST /api/registration/submit
// Complete registration workflow
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();

    const client = await clientPromise;
    const db = client.db();

    // ========================================================================
    // STEP 1: VALIDATION
    // ========================================================================

    // Check if member is banned
    if (payload.memberId && !payload.isNewMember) {
      const member = await db.collection("members").findOne({
        memberId: payload.memberId,
      });

      if (member?.status?.banned) {
        const bannedUntil = new Date(member.status.bannedUntil);
        if (bannedUntil > new Date()) {
          return NextResponse.json(
            {
              error: "Registration blocked",
              reason: "Member is currently banned",
              details: {
                bannedUntil: bannedUntil.toISOString(),
                banReason: member.status.banReason,
              },
            },
            { status: 403 }
          );
        }
      }
    }

    // Validate required fields
    if (!payload.clubId || !payload.roleIds || !payload.seasonYear) {
      return NextResponse.json(
        { error: "Missing required fields: clubId, roleIds, seasonYear" },
        { status: 400 }
      );
    }

    // Validate agreements
    if (!payload.agreedToTerms || !payload.agreedToCodeOfConduct) {
      return NextResponse.json(
        { error: "Must agree to terms and code of conduct" },
        { status: 400 }
      );
    }

    // ========================================================================
    // STEP 2: GET CLUB AND ASSOCIATIONS
    // ========================================================================

    const club = await db.collection("clubs").findOne({
      $or: [{ id: payload.clubId }, { slug: payload.clubId }],
    });

    if (!club) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    const associations = await getAssociationHierarchy(
      db,
      club.parentAssociationId
    );

    // ========================================================================
    // STEP 3: CALCULATE FEES
    // ========================================================================

    const feesResponse = await fetch(
      `${request.nextUrl.origin}/api/registration/calculate-fees`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clubId: payload.clubId,
          roleIds: payload.roleIds,
          ageCategory: payload.ageCategory,
          seasonYear: payload.seasonYear,
          memberId: payload.memberId,
        }),
      }
    );

    const feesData = await feesResponse.json();
    const lineItems: FeeLineItem[] = feesData.lineItems || [];
    const totalAmount = lineItems.reduce((sum, item) => sum + item.amount, 0);

    // ========================================================================
    // STEP 4: START TRANSACTION
    // ========================================================================

    const session = client.startSession();

    try {
      let result: any = null;

      await session.withTransaction(async () => {
        let memberId = payload.memberId;

        // ====================================================================
        // STEP 5: CREATE OR UPDATE MEMBER
        // ====================================================================

        if (payload.isNewMember || !memberId) {
          // Generate member ID
          memberId = `M${Date.now().toString(36).toUpperCase()}`;

          // Create new member
          const newMember = {
            memberId,

            personalInfo: {
              firstName: payload.personalInfo.firstName,
              lastName: payload.personalInfo.lastName,
              displayName: `${payload.personalInfo.firstName} ${payload.personalInfo.lastName}`,
              dateOfBirth: payload.personalInfo.dateOfBirth,
              gender: payload.personalInfo.gender,
              photoUrl: null,
            },

            contact: {
              primaryEmail: payload.personalInfo.email,
              primaryPhone: payload.personalInfo.phone,
              mobilePhone: payload.personalInfo.mobile,
            },

            address: payload.address || null,
            emergencyContact: payload.emergencyContact || null,
            medicalInfo: payload.medicalInfo || null,

            preferences: {
              shirtSize: payload.shirtSize,
              photoConsent: payload.photoConsent,
            },

            membership: {
              status: "Active",
              joinedDate: new Date(),
              type: payload.membershipType,
            },

            status: {
              banned: false,
              bannedUntil: null,
              banReason: null,
            },

            clubId: club.id, // Set primary club

            associationRegistrations: [],
            clubRegistrations: [],

            createdAt: new Date(),
            updatedAt: new Date(),
          };

          await db.collection("members").insertOne(newMember, { session });
        } else {
          // Update existing member if data provided
          const updateData: Record<string, unknown> = {
            updatedAt: new Date(),
          };

          if (payload.address) updateData.address = payload.address;
          if (payload.emergencyContact)
            updateData.emergencyContact = payload.emergencyContact;
          if (payload.medicalInfo) updateData.medicalInfo = payload.medicalInfo;
          if (payload.shirtSize)
            updateData["preferences.shirtSize"] = payload.shirtSize;

          await db
            .collection("members")
            .updateOne({ memberId }, { $set: updateData }, { session });
        }

        // ====================================================================
        // STEP 6: CREATE ASSOCIATION REGISTRATIONS (ALL LEVELS)
        // ====================================================================

        const associationRegistrations = [];

        for (const association of associations) {
          const regId = `AREG-${association.code}-${memberId}-${
            payload.seasonYear
          }-${Date.now().toString(36)}`;

          // Get fees for this association
          const assocFees = lineItems.filter(
            (f) =>
              f.type === "association" &&
              f.associationId === association.associationId
          );

          const registration = {
            registrationId: regId,
            memberId,
            associationId: association.associationId,
            associationName: association.name,
            seasonYear: payload.seasonYear,

            // Auto-approve unless settings require approval
            status: association.settings?.requiresApproval
              ? "pending"
              : "active",

            roleIds: payload.roleIds,
            ageCategory: payload.ageCategory,
            playerClassification: payload.playerClassification,

            fees: assocFees,

            registeredDate: new Date(),
            approvedDate: !association.settings?.requiresApproval
              ? new Date()
              : null,

            createdAt: new Date(),
            updatedAt: new Date(),
          };

          await db
            .collection("association-registrations")
            .insertOne(registration, { session });

          associationRegistrations.push({
            registrationId: regId,
            associationId: association.associationId,
            associationName: association.name,
            status: registration.status,
          });

          // Add to member's associationRegistrations array
          await db.collection("members").updateOne(
            { memberId },
            {
              $push: {
                associationRegistrations: {
                  registrationId: regId,
                  associationId: association.associationId,
                  associationName: association.name,
                  seasonYear: payload.seasonYear,
                  status: registration.status,
                } as any,
              },
            },
            { session }
          );
        }

        // ====================================================================
        // STEP 7: CREATE CLUB REGISTRATION
        // ====================================================================

        const clubRegId = `CREG-${club.id}-${memberId}-${
          payload.seasonYear
        }-${Date.now().toString(36)}`;

        const clubFees = lineItems.filter((f) => f.type === "club");

        const clubRegistration = {
          registrationId: clubRegId,
          memberId,
          clubId: club.id,
          clubName: club.name,
          registrationType: "primary",
          seasonYear: payload.seasonYear,
          status: "active", // Clubs auto-approve

          roleIds: payload.roleIds,
          ageCategory: payload.ageCategory,

          fees: clubFees,

          membershipType: payload.membershipType,
          wantsVolunteer: payload.wantsVolunteer,

          registeredDate: new Date(),
          approvedDate: new Date(),

          createdAt: new Date(),
          updatedAt: new Date(),
        };

        await db
          .collection("club-registrations")
          .insertOne(clubRegistration, { session });

        // Add to member's clubRegistrations array
        await db.collection("members").updateOne(
          { memberId },
          {
            $push: {
              clubRegistrations: {
                registrationId: clubRegId,
                clubId: club.id,
                clubName: club.name,
                registrationType: "primary",
                seasonYear: payload.seasonYear,
                status: "active",
              } as any,
            },
          },
          { session }
        );

        // ====================================================================
        // STEP 8: CREATE PAYMENT RECORD
        // ====================================================================

        const paymentId = `PAY-${Date.now().toString(36).toUpperCase()}`;

        const payment = {
          paymentId,
          memberId,
          amount: totalAmount,
          status: "pending",

          lineItems,

          seasonYear: payload.seasonYear,
          clubId: club.id,

          paymentMethod: payload.paymentMethod,

          createdAt: new Date(),
          updatedAt: new Date(),
        };

        await db.collection("payments").insertOne(payment, { session });

        // ====================================================================
        // STEP 9: BUILD RESULT
        // ====================================================================

        result = {
          success: true,
          message: "Registration completed successfully",

          registrationId: clubRegId, // Primary registration ID
          memberId,

          member: {
            memberId,
            isNew: payload.isNewMember || !payload.memberId,
            firstName: payload.personalInfo.firstName,
            lastName: payload.personalInfo.lastName,
            email: payload.personalInfo.email,
          },

          associationRegistrations,

          clubRegistration: {
            registrationId: clubRegId,
            clubId: club.id,
            clubName: club.name,
            status: "active",
          },

          payment: {
            paymentId,
            amount: totalAmount,
            status: "pending",
            lineItemCount: lineItems.length,
          },

          fees: {
            total: totalAmount,
            itemCount: lineItems.length,
          },

          nextSteps: [
            "Complete payment",
            totalAmount > 0
              ? `Payment of $${totalAmount.toFixed(2)} required`
              : null,
            "Update your member profile",
            "Join a team",
            "Check your email for confirmation",
          ].filter(Boolean),
        };
      });

      // ── Send registration confirmation email (best-effort, non-blocking) ──
      if (result?.member && payload.personalInfo?.email) {
        const clubName = result.clubRegistration?.clubName ?? "your club";
        const membershipType =
          (payload.membershipTypes ?? []).join(", ") || "Member";

        const { subject, html, text } = buildRegistrationConfirmationEmail({
          firstName: payload.personalInfo.firstName ?? "there",
          memberId: result.memberId,
          clubName,
          membershipType,
          season: payload.season ?? new Date().getFullYear().toString(),
        });

        // Fire-and-forget — don't let email failure block the 201 response
        sendEmail({
          to: payload.personalInfo.email,
          subject,
          html,
          text,
        }).catch((err) =>
          console.error("Registration confirmation email failed:", err)
        );
      }

      // Transaction completed successfully
      return NextResponse.json(result, { status: 201 });
    } finally {
      await session.endSession();
    }
  } catch (error: unknown) {
    console.error("Error submitting registration:", error);
    return NextResponse.json(
      { error: "Failed to submit registration", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// ============================================================================
// HELPER: Get association hierarchy
// ============================================================================

async function getAssociationHierarchy(
  db: Db,
  associationId: string,
): Promise<WithId<Document>[]> {
  const hierarchy: WithId<Document>[] = [];
  let currentId: string | undefined = associationId;

  while (currentId) {
    const association: WithId<Document> | null = await db
      .collection("associations")
      .findOne({
        associationId: currentId,
      });

    if (!association) break;

    hierarchy.push(association);
    currentId = association.parentAssociationId;
  }

  return hierarchy;
}
