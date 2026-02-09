// app/api/clubs/[clubId]/members/[memberId]/renew/route.ts
// API endpoint for membership renewal

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { canRenewMembership } from "@/lib/auth-utils";
import { getRenewalDates } from "@/types/member";

// Note: You'll need to implement getUserFromRequest based on your auth solution
async function getUserFromRequest(request: NextRequest) {
  // TODO: Implement based on your auth solution (NextAuth, Clerk, etc.)
  // This is a placeholder
  return {
    userId: "user123",
    email: "admin@example.com",
    role: "clubadmin" as const,
    clubId: "club123",
  };
}

export async function POST(
  request: NextRequest,
  { params }: { params: { clubId: string; memberId: string } },
) {
  try {
    const { clubId, memberId } = params;
    const user = await getUserFromRequest(request);

    // Check authorization
    if (!canRenewMembership(user, clubId, memberId)) {
      return NextResponse.json(
        { error: "You do not have permission to renew memberships" },
        { status: 403 },
      );
    }

    const client = await clientPromise;
    const db = client.db("hockey");
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
      fee,
      notes,
    } = body;

    // Generate renewal dates
    const { periodStart, periodEnd } = getRenewalDates(targetYear);

    // Create renewal record
    const renewal = {
      renewalId: `renewal-${Date.now()}`,
      renewalDate: new Date().toISOString(),
      periodStart,
      periodEnd,
      membershipType,
      fee: fee || 0,
      renewedBy: user.userId,
      notes: notes || "",
    };

    // Update member with new period and add to renewal history
    const result = await collection.updateOne(
      { memberId, clubId },
      {
        $set: {
          "membership.currentPeriodStart": periodStart,
          "membership.currentPeriodEnd": periodEnd,
          "membership.membershipType": membershipType,
          "membership.status": "Active",
          updatedAt: new Date().toISOString(),
          updatedBy: user.userId,
        },
        $push: {
          "membership.renewalHistory": renewal,
        },
      },
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: "Failed to renew membership" },
        { status: 500 },
      );
    }

    // Fetch and return updated member
    const updatedMember = await collection.findOne({ memberId, clubId });

    return NextResponse.json({
      success: true,
      message: "Membership renewed successfully",
      member: updatedMember,
      renewal,
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
  { params }: { params: { clubId: string; memberId: string } },
) {
  try {
    const { clubId, memberId } = params;
    const user = await getUserFromRequest(request);

    // Check authorization
    if (!canRenewMembership(user, clubId, memberId)) {
      return NextResponse.json(
        { error: "You do not have permission to view renewal information" },
        { status: 403 },
      );
    }

    const client = await clientPromise;
    const db = client.db("hockey");
    const collection = db.collection("members");

    // Get current member
    const member = await collection.findOne({ memberId, clubId });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Generate renewal preview
    const { periodStart, periodEnd } = getRenewalDates();

    const renewalPreview = {
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
    };

    return NextResponse.json(renewalPreview);
  } catch (error) {
    console.error("Error fetching renewal preview:", error);
    return NextResponse.json(
      { error: "Failed to fetch renewal information" },
      { status: 500 },
    );
  }
}
