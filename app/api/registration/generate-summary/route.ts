// app/api/registration/generate-summary/route.ts
// Generate complete registration summary for review

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import type { FeeLineItem } from "@/types/registration";

// ============================================================================
// POST /api/registration/generate-summary
// Generate complete registration summary including all fees and details
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();

    const {
      memberId,
      isNewMember,
      personalInfo,
      clubId,
      roleIds,
      ageCategory,
      seasonYear,
    } = payload;

    const client = await clientPromise;
    const db = client.db();

    // Get club
    const club = await db.collection("clubs").findOne({
      $or: [{ id: clubId }, { slug: clubId }],
    });

    if (!club) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    // Get roles
    const roles = await db
      .collection("club-roles")
      .find({ id: { $in: roleIds } })
      .toArray();

    // Get association hierarchy
    const associations = await getAssociationHierarchy(
      db,
      club.parentAssociationId
    );

    // Calculate fees
    const feesResponse = await fetch(
      `${request.nextUrl.origin}/api/registration/calculate-fees`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clubId,
          roleIds,
          ageCategory,
          seasonYear,
          memberId,
        }),
      }
    );

    const feesData = await feesResponse.json();
    const lineItems: FeeLineItem[] = feesData.lineItems || [];

    // Group fees by association level
    const associationFees = associations.map((assoc: any) => {
      const assocFees = lineItems.filter(
        (f) =>
          f.type === "association" && f.associationId === assoc.associationId
      );
      return {
        associationId: assoc.associationId,
        name: assoc.name,
        code: assoc.code,
        level: assoc.level,
        fees: assocFees,
      };
    });

    const clubFees = lineItems.filter((f) => f.type === "club");
    const insuranceFees = lineItems.filter((f) => f.type === "insurance");
    const otherFees = lineItems.filter(
      (f) => !["association", "club", "insurance"].includes(f.type)
    );

    // Calculate totals
    const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
    const gst = lineItems.reduce((sum, item) => {
      if (item.gstIncluded) {
        return sum + (item.amount - item.amount / 1.1);
      }
      return sum;
    }, 0);

    // Check if requires approval
    const primaryAssociation = associations[0];
    const requiresApproval =
      primaryAssociation?.settings?.requiresApproval ?? false;

    // Check if auto-approved for returning players
    const autoApproved =
      !requiresApproval ||
      (primaryAssociation?.settings?.autoApproveReturningPlayers &&
        !isNewMember);

    // Get member details (if existing)
    let memberDetails = null;
    if (memberId && !isNewMember) {
      const member = await db.collection("members").findOne({ memberId });
      if (member) {
        memberDetails = {
          memberId: member.memberId,
          firstName: member.personalInfo?.firstName,
          lastName: member.personalInfo?.lastName,
          email: member.contact?.primaryEmail,
          dateOfBirth: member.personalInfo?.dateOfBirth,
          membershipStatus: member.membership?.status,
        };
      }
    }

    // Build summary
    const summary = {
      // Member information
      member: memberDetails || {
        isNew: true,
        firstName: personalInfo?.firstName,
        lastName: personalInfo?.lastName,
        email: personalInfo?.email,
        dateOfBirth: personalInfo?.dateOfBirth,
      },

      // Registration hierarchy
      registrations: {
        // Primary association (direct parent)
        association: {
          associationId: primaryAssociation.associationId,
          name: primaryAssociation.name,
          code: primaryAssociation.code,
          fees: associationFees[0]?.fees || [],
        },

        // Parent associations (grandparents)
        parentAssociations: associations
          .slice(1)
          .map((assoc: any, index: number) => ({
            associationId: assoc.associationId,
            name: assoc.name,
            code: assoc.code,
            level: assoc.level,
            fees: associationFees[index + 1]?.fees || [],
          })),

        // Club
        club: {
          clubId: club.id,
          name: club.name,
          slug: club.slug,
          fees: clubFees,
        },
      },

      // Roles
      roles: roles.map((r: any) => ({
        roleId: r.id,
        name: r.name,
        category: r.category,
        description: r.description,
      })),

      // Age category
      ageCategory,
      seasonYear,

      // Fees breakdown
      fees: {
        lineItems,

        byType: {
          association: associationFees,
          club: clubFees,
          insurance: insuranceFees,
          other: otherFees,
        },

        summary: {
          subtotal,
          gst,
          total: subtotal,
          itemCount: lineItems.length,
        },
      },

      // Approval status
      requiresApproval,
      autoApproved,
      approvalMessage: requiresApproval
        ? autoApproved
          ? "Your registration will be automatically approved as a returning player"
          : "Your registration will require admin approval"
        : "No approval required - registration will be active immediately",

      // Association hierarchy display
      hierarchy: associations.map((a: any) => ({
        associationId: a.associationId,
        name: a.name,
        code: a.code,
        level: a.level,
      })),
    };

    return NextResponse.json(summary);
  } catch (error: any) {
    console.error("Error generating summary:", error);
    return NextResponse.json(
      { error: "Failed to generate summary", details: error.message },
      { status: 500 }
    );
  }
}

// ============================================================================
// HELPER: Get association hierarchy
// ============================================================================

async function getAssociationHierarchy(db: any, associationId: string) {
  const hierarchy: any[] = [];
  let currentId: string | undefined = associationId;

  while (currentId) {
    const association = await db.collection("associations").findOne({
      associationId: currentId,
    });

    if (!association) break;

    hierarchy.push(association);
    currentId = association.parentAssociationId;
  }

  return hierarchy;
}
