// Family-Related Schemas

// ===== FAMILIES COLLECTION =====
export interface Family {
  // Identity
  familyId: string; // "fam-xxxxx"
  familyName: string; // "Smith Family"

  // Primary Contact
  primaryContact: {
    memberId: string; // Who manages the family account
    userId?: string | null; // Their user account (if they have one)
    role: "Parent" | "Guardian" | "Self";
  };

  // Members in this family
  members: {
    memberId: string;
    clubId: string; // Which club they're at
    relationship: string; // Ref to family_relationships
    isPrimary: boolean; // Is this the primary member?
  }[];

  // Contact & Billing
  billingContact: {
    name: string;
    email: string;
    phone: string;
    address: {
      street: string;
      suburb: string;
      state: string;
      postcode: string;
      country: string;
    };
  };

  // Family Settings
  settings: {
    sharedBilling: boolean; // All members on one invoice
    sharedCommunication: boolean; // All communications to primary contact
    familyDiscountEligible: boolean;
  };

  // Emergency Contact (shared across family)
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
    mobile: string;
  };

  // Notes
  notes?: string;

  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

// ===== FAMILY RELATIONSHIPS COLLECTION =====
export interface FamilyRelationship {
  relationshipId: string; // "rel-parent"
  name: string; // "Parent"
  category: "Parent" | "Child" | "Sibling" | "Spouse" | "Other";
  canManageOthers: boolean; // Can this relationship manage other family members?
  displayOrder: number;
  active: boolean;
  createdAt: string;
}

// ===== FAMILY DISCOUNTS COLLECTION =====
export interface FamilyDiscount {
  discountId: string;
  clubId?: string | null; // Club-specific or null for global
  name: string; // "Family Discount"
  description: string;

  // Eligibility
  minMembers: number; // Minimum family members to qualify
  memberTypes?: string[]; // Which membership types qualify
  mustBeSameClub: boolean; // Must all be in same club?

  // Discount
  discountType: "Percentage" | "Fixed" | "FreeAdditional";
  discountValue: number; // 10 (for 10%) or 50 (for $50)

  // Rules
  applyToFirst?: number; // First N pay full price
  maxDiscount?: number; // Maximum discount amount

  // Status
  active: boolean;
  validFrom?: string;
  validTo?: string;

  // Metadata
  createdAt: string;
  updatedAt: string;
}

// ===== UPDATED MEMBER SCHEMA (with family link) =====
export interface MemberWithFamily {
  // ... all existing Member fields ...

  // Family Relationship (NEW)
  family?: {
    familyId: string; // Link to families collection
    relationship: string; // Ref to family_relationships
    isPrimaryContact: boolean; // Can manage other family members?
  } | null;
}

// ===== HELPER FUNCTIONS =====

// Generate family ID
export function generateFamilyId(): string {
  return `fam-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Get family members across all clubs
export async function getFamilyMembers(db: any, familyId: string) {
  const family = await db.collection("families").findOne({ familyId });
  if (!family) return [];

  const memberIds = family.members.map((m: any) => m.memberId);
  return await db
    .collection("members")
    .find({
      memberId: { $in: memberIds },
    })
    .toArray();
}

// Check if user can manage a member (via family relationship)
export function canManageFamilyMember(
  userMember: MemberWithFamily,
  targetMember: MemberWithFamily
): boolean {
  // Not in same family
  if (!userMember.family || !targetMember.family) return false;
  if (userMember.family.familyId !== targetMember.family.familyId) return false;

  // User must be primary contact
  if (!userMember.family.isPrimaryContact) return false;

  // Check relationship allows management
  // This would lookup the relationship in family_relationships collection
  // For now, assume parents can manage children
  return true;
}

// Calculate family discount
export function calculateFamilyDiscount(
  family: Family,
  members: any[],
  discount: FamilyDiscount
): number {
  // Check eligibility
  if (members.length < discount.minMembers) return 0;

  // Check club requirement
  if (discount.mustBeSameClub) {
    const clubs = new Set(members.map((m) => m.clubId));
    if (clubs.size > 1) return 0;
  }

  // Check member types
  if (discount.memberTypes && discount.memberTypes.length > 0) {
    const eligibleMembers = members.filter((m) =>
      discount.memberTypes!.includes(m.membership.membershipType)
    );
    if (eligibleMembers.length < discount.minMembers) return 0;
  }

  // Calculate total fees
  const totalFees = members.reduce((sum, m) => {
    // Get membership type fee
    const membershipType = m.membership.membershipType;
    const fee = getMembershipTypeFee(membershipType); // Helper function
    return sum + fee;
  }, 0);

  let discountAmount = 0;

  switch (discount.discountType) {
    case "Percentage":
      discountAmount = totalFees * (discount.discountValue / 100);
      break;

    case "Fixed":
      discountAmount = discount.discountValue;
      break;

    case "FreeAdditional":
      // Free for members after the first N
      if (discount.applyToFirst) {
        const freeMembers = members.slice(discount.applyToFirst);
        discountAmount = freeMembers.reduce((sum, m) => {
          const fee = getMembershipTypeFee(m.membership.membershipType);
          return sum + fee;
        }, 0);
      }
      break;
  }

  // Apply max discount cap
  if (discount.maxDiscount && discountAmount > discount.maxDiscount) {
    discountAmount = discount.maxDiscount;
  }

  return discountAmount;
}

// Helper to get membership type fee (would query database)
function getMembershipTypeFee(typeId: string): number {
  // This would lookup the actual fee from membership_types collection
  // For now, return placeholder
  const fees: Record<string, number> = {
    "type-junior": 150,
    "type-senior": 300,
    "type-social": 50,
    "type-life": 0,
  };
  return fees[typeId] || 0;
}

// Get all families a user can manage
export async function getUserManagedFamilies(db: any, userId: string) {
  // Get user's memberships
  const user = await db.collection("users").findOne({ userId });
  if (!user) return [];

  const membershipIds = user.memberships.map((m: any) => m.memberId);

  // Get member records
  const members = await db
    .collection("members")
    .find({
      memberId: { $in: membershipIds },
    })
    .toArray();

  // Get families where user is primary contact
  const familyIds = members
    .filter((m: any) => m.family?.isPrimaryContact)
    .map((m: any) => m.family.familyId);

  return await db
    .collection("families")
    .find({
      familyId: { $in: familyIds },
    })
    .toArray();
}

// Add member to family
export async function addMemberToFamily(
  db: any,
  familyId: string,
  memberId: string,
  clubId: string,
  relationship: string
) {
  // Update family
  await db.collection("families").updateOne(
    { familyId },
    {
      $push: {
        members: {
          memberId,
          clubId,
          relationship,
          isPrimary: false,
        },
      },
      $set: {
        updatedAt: new Date().toISOString(),
      },
    }
  );

  // Update member
  await db.collection("members").updateOne(
    { memberId },
    {
      $set: {
        family: {
          familyId,
          relationship,
          isPrimaryContact: false,
        },
        updatedAt: new Date().toISOString(),
      },
    }
  );
}

// Remove member from family
export async function removeMemberFromFamily(
  db: any,
  familyId: string,
  memberId: string
) {
  // Update family
  await db.collection("families").updateOne(
    { familyId },
    {
      $pull: {
        members: { memberId },
      },
      $set: {
        updatedAt: new Date().toISOString(),
      },
    }
  );

  // Update member
  await db.collection("members").updateOne(
    { memberId },
    {
      $unset: {
        family: "",
      },
      $set: {
        updatedAt: new Date().toISOString(),
      },
    }
  );
}
