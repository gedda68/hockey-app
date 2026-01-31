// app/api/registration/calculate-fees/route.ts
// Calculate all fees from association hierarchy and club

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import type { FeeLineItem } from "@/types/registration";

// ============================================================================
// POST /api/registration/calculate-fees
// Calculate fees for registration based on club, roles, and age category
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const { clubId, roleIds, ageCategory, seasonYear, memberId } =
      await request.json();

    if (!clubId || !roleIds || !ageCategory || !seasonYear) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: clubId, roleIds, ageCategory, seasonYear",
        },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db();

    // Get club
    const club = await db.collection("clubs").findOne({
      $or: [{ id: clubId }, { slug: clubId }],
    });

    if (!club) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    // Get role details
    const roles = await db
      .collection("club-roles")
      .find({ id: { $in: roleIds } })
      .toArray();

    const roleCategories = roles.map((r: any) => r.category);

    // Calculate age from DOB if member exists
    let calculatedAge: number | undefined;
    if (memberId) {
      const member = await db.collection("members").findOne({ memberId });
      if (member?.personalInfo?.dateOfBirth) {
        const dob = new Date(member.personalInfo.dateOfBirth);
        const today = new Date();
        calculatedAge = today.getFullYear() - dob.getFullYear();
      }
    }

    // Get association hierarchy
    const associations = await getAssociationHierarchy(
      db,
      club.parentAssociationId
    );

    const lineItems: FeeLineItem[] = [];
    let itemCounter = 0;

    // ========================================================================
    // ASSOCIATION FEES (for each level in hierarchy)
    // ========================================================================

    for (const association of associations) {
      if (!association.fees || association.fees.length === 0) continue;

      const applicableFees = association.fees.filter((fee: any) => {
        // Must be active
        if (!fee.isActive) return false;

        // Check date validity
        const now = new Date();
        if (fee.validFrom && new Date(fee.validFrom) > now) return false;
        if (fee.validTo && new Date(fee.validTo) < now) return false;

        // Check age category
        if (fee.appliesTo?.ageCategories) {
          if (!fee.appliesTo.ageCategories.includes(ageCategory)) {
            return false;
          }
        }

        // Check age range
        if (calculatedAge !== undefined) {
          if (fee.appliesTo?.minAge && calculatedAge < fee.appliesTo.minAge) {
            return false;
          }
          if (fee.appliesTo?.maxAge && calculatedAge > fee.appliesTo.maxAge) {
            return false;
          }
        }

        // Check role categories
        if (fee.appliesTo?.roleCategories) {
          const hasMatchingRole = fee.appliesTo.roleCategories.some(
            (cat: string) => roleCategories.includes(cat)
          );
          if (!hasMatchingRole) return false;
        }

        return true;
      });

      // Add applicable fees as line items
      for (const fee of applicableFees) {
        lineItems.push({
          itemId: `assoc-${association.associationId}-${
            fee.feeId
          }-${itemCounter++}`,
          feeId: fee.feeId,
          type: "association",
          name: `${association.name} - ${fee.name}`,
          description: fee.description,
          amount: fee.amount,
          gstIncluded: fee.gstIncluded ?? true,
          associationId: association.associationId,
        });
      }
    }

    // ========================================================================
    // CLUB FEES
    // ========================================================================

    if (club.fees && club.fees.length > 0) {
      const applicableClubFees = club.fees.filter((fee: any) => {
        if (!fee.isActive) return false;

        const now = new Date();
        if (fee.validFrom && new Date(fee.validFrom) > now) return false;
        if (fee.validTo && new Date(fee.validTo) < now) return false;

        if (fee.appliesTo?.ageCategories) {
          if (!fee.appliesTo.ageCategories.includes(ageCategory)) {
            return false;
          }
        }

        if (calculatedAge !== undefined) {
          if (fee.appliesTo?.minAge && calculatedAge < fee.appliesTo.minAge) {
            return false;
          }
          if (fee.appliesTo?.maxAge && calculatedAge > fee.appliesTo.maxAge) {
            return false;
          }
        }

        if (fee.appliesTo?.roleCategories) {
          const hasMatchingRole = fee.appliesTo.roleCategories.some(
            (cat: string) => roleCategories.includes(cat)
          );
          if (!hasMatchingRole) return false;
        }

        return true;
      });

      for (const fee of applicableClubFees) {
        lineItems.push({
          itemId: `club-${club.id}-${fee.feeId}-${itemCounter++}`,
          feeId: fee.feeId,
          type: "club",
          name: `${club.name} - ${fee.name}`,
          description: fee.description,
          amount: fee.amount,
          gstIncluded: fee.gstIncluded ?? true,
          clubId: club.id,
        });
      }
    }

    // ========================================================================
    // INSURANCE (if required by association settings)
    // ========================================================================

    const primaryAssociation = associations[0];
    const requiresInsurance =
      primaryAssociation?.settings?.requiresInsurance ?? true;

    if (requiresInsurance) {
      // Get insurance fee based on age category
      const insuranceFees: Record<string, number> = {
        junior: 20.0,
        senior: 25.0,
        masters: 30.0,
      };

      const insuranceAmount = insuranceFees[ageCategory] || 25.0;

      lineItems.push({
        itemId: `insurance-${itemCounter++}`,
        feeId: "insurance-standard",
        type: "insurance",
        name: "Personal Accident Insurance",
        description: "Compulsory personal accident insurance",
        amount: insuranceAmount,
        gstIncluded: false,
      });
    }

    // ========================================================================
    // CALCULATE TOTALS
    // ========================================================================

    const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);

    // Calculate GST (for items where GST is included, extract it)
    const gst = lineItems.reduce((sum, item) => {
      if (item.gstIncluded) {
        // GST = amount - (amount / 1.1)
        return sum + (item.amount - item.amount / 1.1);
      }
      return sum;
    }, 0);

    const total = subtotal;

    // Group fees by type for display
    const feesByType = {
      association: lineItems.filter((f) => f.type === "association"),
      club: lineItems.filter((f) => f.type === "club"),
      insurance: lineItems.filter((f) => f.type === "insurance"),
      other: lineItems.filter(
        (f) => !["association", "club", "insurance"].includes(f.type)
      ),
    };

    return NextResponse.json({
      lineItems,
      feesByType,
      summary: {
        subtotal,
        gst,
        total,
        itemCount: lineItems.length,
      },
      associations: associations.map((a: any) => ({
        associationId: a.associationId,
        name: a.name,
        level: a.level,
      })),
      club: {
        id: club.id,
        name: club.name,
      },
    });
  } catch (error: any) {
    console.error("Error calculating fees:", error);
    return NextResponse.json(
      { error: "Failed to calculate fees", details: error.message },
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

  return hierarchy; // Returns [BHA, HQ, HA] (closest to farthest)
}
