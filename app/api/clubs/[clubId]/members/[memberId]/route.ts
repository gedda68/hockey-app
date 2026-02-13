// app/api/clubs/[clubId]/members/[memberId]/route.ts
// TEMPORARY - NO AUTH VERSION FOR TESTING

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

// GET - View a member
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clubId: string; memberId: string }> },
) {
  try {
    const { clubId: clubIdOrSlug, memberId } = await params;

    console.log("⚠️ WARNING: Auth is disabled for testing");
    console.log(`🔍 Looking for member ${memberId} in club ${clubIdOrSlug}`);

    const client = await clientPromise;
    const db = client.db("hockey-app");

    // Convert slug to clubId if needed
    let actualClubId = clubIdOrSlug;

    // Check if this is a slug (doesn't start with 'club-')
    if (!clubIdOrSlug.startsWith("club-")) {
      console.log(`🔍 Converting slug "${clubIdOrSlug}" to clubId...`);
      const clubsCollection = db.collection("clubs");
      const club = await clubsCollection.findOne({ slug: clubIdOrSlug });

      if (club) {
        actualClubId = club.id;
        console.log(`✅ Found club: ${club.name} (${actualClubId})`);
      } else {
        console.log(`❌ No club found with slug: ${clubIdOrSlug}`);
      }
    }

    const collection = db.collection("members");
    const member = await collection.findOne({ memberId, clubId: actualClubId });

    if (!member) {
      // Check if member exists in a different club
      const memberInOtherClub = await collection.findOne({ memberId });
      if (memberInOtherClub) {
        console.log(
          `❌ Member ${memberId} found but in different club: ${memberInOtherClub.clubId}`,
        );
        console.log(`   Requested club: ${actualClubId}`);
        console.log(`   Actual club: ${memberInOtherClub.clubId}`);
        return NextResponse.json(
          {
            error: "Member not found in this club",
            hint: `This member belongs to club: ${memberInOtherClub.clubId}`,
          },
          { status: 404 },
        );
      }

      console.log(`❌ Member ${memberId} not found at all`);
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    console.log(
      `✅ Member found: ${member.personalInfo?.firstName} ${member.personalInfo?.lastName}`,
    );
    return NextResponse.json(member);
  } catch (error) {
    console.error("Error fetching member:", error);
    return NextResponse.json(
      { error: "Failed to fetch member" },
      { status: 500 },
    );
  }
}

// PUT - Update a member
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ clubId: string; memberId: string }> },
) {
  try {
    const { clubId: clubIdOrSlug, memberId } = await params;
    const updates = await request.json();

    console.log("⚠️ WARNING: Auth is disabled for testing");

    const client = await clientPromise;
    const db = client.db("hockey-app");

    // Convert slug to clubId if needed
    let actualClubId = clubIdOrSlug;
    if (!clubIdOrSlug.startsWith("club-")) {
      const clubsCollection = db.collection("clubs");
      const club = await clubsCollection.findOne({ slug: clubIdOrSlug });
      if (club) {
        actualClubId = club.id;
        console.log(`✅ Converted slug to clubId: ${actualClubId}`);
      }
    }

    const collection = db.collection("members");

    const result = await collection.updateOne(
      { memberId, clubId: actualClubId },
      {
        $set: {
          ...updates,
          updatedAt: new Date().toISOString(),
        },
      },
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const updatedMember = await collection.findOne({
      memberId,
      clubId: actualClubId,
    });
    return NextResponse.json(updatedMember);
  } catch (error) {
    console.error("Error updating member:", error);
    return NextResponse.json(
      { error: "Failed to update member" },
      { status: 500 },
    );
  }
}

// DELETE - Delete a member
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ clubId: string; memberId: string }> },
) {
  try {
    const { clubId: clubIdOrSlug, memberId } = await params;

    console.log("⚠️ WARNING: Auth is disabled for testing");

    const client = await clientPromise;
    const db = client.db("hockey-app");

    // Convert slug to clubId if needed
    let actualClubId = clubIdOrSlug;
    if (!clubIdOrSlug.startsWith("club-")) {
      const clubsCollection = db.collection("clubs");
      const club = await clubsCollection.findOne({ slug: clubIdOrSlug });
      if (club) {
        actualClubId = club.id;
        console.log(`✅ Converted slug to clubId: ${actualClubId}`);
      }
    }

    const collection = db.collection("members");

    const result = await collection.deleteOne({
      memberId,
      clubId: actualClubId,
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Failed to delete member" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, message: "Member deleted" });
  } catch (error) {
    console.error("Error deleting member:", error);
    return NextResponse.json(
      { error: "Failed to delete member" },
      { status: 500 },
    );
  }
}
