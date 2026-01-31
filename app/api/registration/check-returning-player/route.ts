// app/api/registration/check-returning-player/route.ts
// Check if returning player and get auto-fill data

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

// ============================================================================
// POST /api/registration/check-returning-player
// Check if email matches existing member and return auto-fill data
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const { email, clubId } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();

    // Find member by email
    const member = await db.collection("members").findOne({
      "contact.primaryEmail": { $regex: new RegExp(`^${email}$`, "i") },
    });

    // If no member found, return new player response
    if (!member) {
      return NextResponse.json({
        isReturningPlayer: false,
        memberId: null,
        previousRegistrations: [],
        suggestedData: {},
      });
    }

    // Get previous registrations
    const previousRegistrations = await db
      .collection("club-registrations")
      .find({ memberId: member.memberId })
      .sort({ seasonYear: -1 })
      .limit(5)
      .toArray();

    // Get previous association registrations
    const previousAssociationRegs = await db
      .collection("association-registrations")
      .find({ memberId: member.memberId })
      .sort({ seasonYear: -1 })
      .limit(3)
      .toArray();

    // Check if previously registered at this club
    const registeredAtClub = previousRegistrations.some(
      (reg: any) => reg.clubId === clubId
    );

    // Get most recent roles
    const mostRecentReg = previousRegistrations[0] as any;
    const previousRoles = mostRecentReg?.roleIds || [];

    // Build suggested data from member record
    const suggestedData = {
      personalInfo: {
        firstName: member.personalInfo?.firstName,
        lastName: member.personalInfo?.lastName,
        displayName: member.personalInfo?.displayName,
        dateOfBirth: member.personalInfo?.dateOfBirth,
        gender: member.personalInfo?.gender,
        email: member.contact?.primaryEmail,
        phone: member.contact?.primaryPhone,
        mobile: member.contact?.mobilePhone,
      },

      address: member.address
        ? {
            street: member.address.street,
            suburb: member.address.suburb,
            city: member.address.city,
            state: member.address.state,
            postcode: member.address.postcode,
            country: member.address.country || "Australia",
          }
        : null,

      emergencyContact: member.emergencyContact
        ? {
            name: member.emergencyContact.name,
            relationship: member.emergencyContact.relationship,
            phone: member.emergencyContact.phone,
            alternatePhone: member.emergencyContact.alternatePhone,
          }
        : null,

      medicalInfo: member.medicalInfo
        ? {
            conditions: member.medicalInfo.conditions,
            medications: member.medicalInfo.medications,
            allergies: member.medicalInfo.allergies,
            doctorName: member.medicalInfo.doctorName,
            doctorPhone: member.medicalInfo.doctorPhone,
            healthFundProvider: member.medicalInfo.healthFundProvider,
            healthFundNumber: member.medicalInfo.healthFundNumber,
          }
        : null,

      preferences: {
        shirtSize: member.preferences?.shirtSize,
        photoConsent: member.preferences?.photoConsent ?? false,
        preferredPosition: member.preferences?.preferredPosition,
        jerseyNumber: member.preferences?.preferredJerseyNumber,
      },

      previousRoles,
    };

    // Check if member is banned
    const isBanned = member.status?.banned === true;
    const banDetails = isBanned
      ? {
          reason: member.status?.banReason,
          bannedUntil: member.status?.bannedUntil,
          bannedBy: member.status?.bannedBy,
        }
      : null;

    return NextResponse.json({
      isReturningPlayer: true,
      memberId: member.memberId,

      memberDetails: {
        firstName: member.personalInfo?.firstName,
        lastName: member.personalInfo?.lastName,
        email: member.contact?.primaryEmail,
        status: member.membership?.status,
      },

      previousRegistrations: previousRegistrations.map((reg: any) => ({
        seasonYear: reg.seasonYear,
        clubId: reg.clubId,
        clubName: reg.clubName,
        registrationType: reg.registrationType,
        roleIds: reg.roleIds,
        status: reg.status,
      })),

      previousAssociationRegistrations: previousAssociationRegs.map(
        (reg: any) => ({
          seasonYear: reg.seasonYear,
          associationId: reg.associationId,
          associationName: reg.associationName,
          status: reg.status,
        })
      ),

      registeredAtClubBefore: registeredAtClub,

      suggestedData,

      // Warning if banned
      isBanned,
      banDetails,
    });
  } catch (error: any) {
    console.error("Error checking returning player:", error);
    return NextResponse.json(
      { error: "Failed to check returning player", details: error.message },
      { status: 500 }
    );
  }
}
