// app/api/clubs/[clubId]/members/route.ts
// CRUD operations for club members

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

// GET - List all members for a club
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clubId: string }> }
) {
  try {
    const { clubId } = await params;
    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || "hockey-app");

    // Resolve club (by slug or ID)
    let club = await db.collection("clubs").findOne({ slug: clubId });
    if (!club) {
      club = await db.collection("clubs").findOne({ id: clubId });
    }

    if (!club) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    // Get members for this club
    const members = await db
      .collection("members")
      .find({ clubId: club.id })
      .sort({ "personalInfo.lastName": 1, "personalInfo.firstName": 1 })
      .toArray();

    return NextResponse.json(members);
  } catch (error: any) {
    console.error("Error fetching members:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Create new member
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ clubId: string }> }
) {
  try {
    const { clubId } = await params;
    const body = await request.json();

    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || "hockey-app");

    // Resolve club
    let club = await db.collection("clubs").findOne({ slug: clubId });
    if (!club) {
      club = await db.collection("clubs").findOne({ id: clubId });
    }

    if (!club) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    // Generate member ID
    const currentSequence = club.memberSequence || 0;
    const nextSequence = currentSequence + 1;
    const memberId = `${club.shortName}-${nextSequence
      .toString()
      .padStart(7, "0")}`;

    // Create member
    const member = {
      memberId,
      clubId: club.id,
      associationId: club.associationId || null,

      personalInfo: {
        firstName: body.personalInfo.firstName,
        lastName: body.personalInfo.lastName,
        displayName:
          body.personalInfo.displayName ||
          `${body.personalInfo.firstName} ${body.personalInfo.lastName}`,
        dateOfBirth: body.personalInfo.dateOfBirth,
        gender: body.personalInfo.gender,
        photoUrl: body.personalInfo.photoUrl || null,
      },

      contact: {
        primaryEmail: body.contact.primaryEmail,
        emailOwnership: body.contact.emailOwnership || "Own",
        additionalEmails: body.contact.additionalEmails || [],
        phone: body.contact.phone || "",
        mobile: body.contact.mobile || "",
      },

      address: {
        street: body.address?.street || "",
        suburb: body.address?.suburb || "",
        state: body.address?.state || "QLD",
        postcode: body.address?.postcode || "",
        country: body.address?.country || "Australia",
      },

      healthcare: {
        medicare: body.healthcare?.medicare || null,
        privateHealth: body.healthcare?.privateHealth || null,
      },

      emergencyContacts: body.emergencyContacts || [],

      socialMedia: {
        facebook: body.socialMedia?.facebook || "",
        instagram: body.socialMedia?.instagram || "",
        twitter: body.socialMedia?.twitter || "",
        tiktok: body.socialMedia?.tiktok || "",
        linkedin: body.socialMedia?.linkedin || "",
      },

      communicationPreferences: {
        preferredMethod:
          body.communicationPreferences?.preferredMethod || "Email",
        emailFrequency: body.communicationPreferences?.emailFrequency || "All",
        smsNotifications:
          body.communicationPreferences?.smsNotifications !== false,
        pushNotifications:
          body.communicationPreferences?.pushNotifications !== false,
        socialMediaUpdates:
          body.communicationPreferences?.socialMediaUpdates || false,
      },

      membership: {
        joinDate: body.membership?.joinDate || new Date().toISOString(),
        membershipType: body.membership.membershipType,
        status: body.membership?.status || "Active",
        expiryDate: body.membership?.expiryDate || null,
        renewalDate: body.membership?.renewalDate || null,
      },

      roles: body.roles || [],

      playerInfo: body.playerInfo || null,

      teams: body.teams || [],

      family: body.family || null,

      userId: body.userId || null,

      medical: body.medical || {
        conditions: "",
        medications: "",
        allergies: "",
        doctorName: "",
        doctorPhone: "",
      },

      notes: body.notes || "",

      registrationSource: "ClubAdmin",
      registrationStatus: "Active",

      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: body.createdBy || "club-admin",
      updatedBy: body.createdBy || "club-admin",
    };

    // Insert member
    await db.collection("members").insertOne(member);

    // Update club sequence
    await db
      .collection("clubs")
      .updateOne({ id: club.id }, { $set: { memberSequence: nextSequence } });

    console.log(`✅ Created member: ${memberId} for club ${club.shortName}`);

    return NextResponse.json(member, { status: 201 });
  } catch (error: any) {
    console.error("Error creating member:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
