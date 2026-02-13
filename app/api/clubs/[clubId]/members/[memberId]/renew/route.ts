// app/api/clubs/[clubId]/members/[memberId]/renew/route.ts
// TEMPORARY - NO AUTH VERSION FOR TESTING

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getRenewalDates } from "@/types/member";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ clubId: string; memberId: string }> },
) {
  try {
    const { clubId: clubIdOrSlug, memberId } = await params;

    console.log("⚠️ WARNING: Auth is disabled for testing");

    const client = await clientPromise;
    const db = client.db("hockey-app");

    // Convert slug to clubId if needed
    let clubId = clubIdOrSlug;
    if (!clubIdOrSlug.startsWith("club-")) {
      const clubsCollection = db.collection("clubs");
      const club = await clubsCollection.findOne({ slug: clubIdOrSlug });
      if (club) {
        clubId = club.id;
        console.log(`✅ Converted slug "${clubIdOrSlug}" to clubId: ${clubId}`);
      }
    }

    const collection = db.collection("members");

    // Get current member
    const member = await collection.findOne({ memberId, clubId });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Parse request body for optional overrides
    const body = await request.json();
    const {
      membershipType = member.membership.membershipType,
      targetYear,
      notes = "",
    } = body;

    // Calculate renewal dates
    const { periodStart, periodEnd } = targetYear
      ? {
          periodStart: `${targetYear}-01-01`,
          periodEnd: `${targetYear}-12-31`,
        }
      : getRenewalDates();

    // Create renewal record
    const renewalId = `renewal-${Date.now()}`;
    const renewalRecord = {
      renewalId,
      renewalDate: new Date().toISOString(),
      periodStart,
      periodEnd,
      membershipType,
      renewedBy: "admin", // Placeholder
      notes,
    };

    // Update member
    const updateResult = await collection.updateOne(
      { memberId, clubId },
      {
        $set: {
          "membership.currentPeriodStart": periodStart,
          "membership.currentPeriodEnd": periodEnd,
          "membership.membershipType": membershipType,
          "membership.status": "Active",
          updatedAt: new Date().toISOString(),
        },
        $push: {
          "membership.renewalHistory": renewalRecord,
        },
      },
    );

    if (updateResult.matchedCount === 0) {
      return NextResponse.json(
        { error: "Failed to update member" },
        { status: 500 },
      );
    }

    // Get updated member
    const updatedMember = await collection.findOne({ memberId, clubId });

    return NextResponse.json({
      success: true,
      message: "Membership renewed successfully",
      renewal: renewalRecord,
      member: updatedMember,
    });
  } catch (error) {
    console.error("Error renewing membership:", error);
    return NextResponse.json(
      { error: "Failed to renew membership" },
      { status: 500 },
    );
  }
}

// GET endpoint to preview renewal data
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clubId: string; memberId: string }> },
) {
  try {
    const { clubId: clubIdOrSlug, memberId } = await params;

    console.log("⚠️ WARNING: Auth is disabled for testing");

    const client = await clientPromise;
    const db = client.db("hockey-app");

    // Convert slug to clubId if needed
    let clubId = clubIdOrSlug;
    if (!clubIdOrSlug.startsWith("club-")) {
      const clubsCollection = db.collection("clubs");
      const club = await clubsCollection.findOne({ slug: clubIdOrSlug });
      if (club) {
        clubId = club.id;
        console.log(`✅ Converted slug "${clubIdOrSlug}" to clubId: ${clubId}`);
      }
    }

    const collection = db.collection("members");

    // Get current member
    const member = await collection.findOne({ memberId, clubId });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Generate renewal preview
    const { periodStart, periodEnd } = getRenewalDates();

    return NextResponse.json({
      currentPeriod: {
        start: member.membership.currentPeriodStart,
        end: member.membership.currentPeriodEnd,
      },
      newPeriod: {
        start: periodStart,
        end: periodEnd,
      },
      membershipType: member.membership.membershipType,
      member: {
        name: `${member.personalInfo.firstName} ${member.personalInfo.lastName}`,
        memberId: member.memberId,
        email: member.contact.primaryEmail,
      },
      renewalHistory: member.membership.renewalHistory || [],
    });
  } catch (error) {
    console.error("Error fetching renewal preview:", error);
    return NextResponse.json(
      { error: "Failed to fetch renewal preview" },
      { status: 500 },
    );
  }
}
