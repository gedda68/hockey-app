// types/member.ts
// Updated Member interface with membership period dates

export interface MembershipRenewal {
  renewalId: string;
  renewalDate: string; // ISO date when renewal was processed
  periodStart: string; // Start of membership period (YYYY-MM-DD)
  periodEnd: string; // End of membership period (YYYY-MM-DD)
  membershipType: string; // Type at time of renewal
  fee?: number; // Optional: amount paid
  renewedBy?: string; // Optional: User ID who processed renewal
  notes?: string; // Optional: any notes about the renewal
}

export interface Membership {
  membershipType: string; // Reference to config id
  status: "Active" | "Inactive" | "Expired" | "Pending";
  joinDate: string; // Original join date (ISO format, never changes)
  currentPeriodStart: string; // Start of current period (YYYY-MM-DD)
  currentPeriodEnd: string; // End of current period (YYYY-MM-DD)
  renewalHistory?: MembershipRenewal[]; // History of all renewals
}

export interface Member {
  memberId: string;
  personalInfo: {
    salutation: string;
    firstName: string;
    lastName: string;
    displayName?: string;
    dateOfBirth: string;
    gender: string;
    photoUrl?: string | null;
  };
  contact: {
    primaryEmail: string;
    emailOwnership: string;
    phone?: string;
    mobile?: string;
  };
  address: {
    street: string;
    suburb: string;
    state: string;
    postcode: string;
    country: string;
  };
  healthcare?: {
    medicare?: {
      number: string;
      position: string;
      expiryMonth: string;
      expiryYear: string;
    } | null;
    privateHealth?: {
      provider: string;
      membershipNumber: string;
      expiryDate: string;
    } | null;
  };
  emergencyContacts?: Array<{
    contactId: string;
    priority: number;
    name: string;
    relationship: string;
    phone?: string;
    mobile?: string;
    email?: string;
  }>;
  membership: Membership;
  roles: string[];
  playerInfo?: {
    jerseyNumber?: string;
    position?: string;
  } | null;
  medical?: {
    conditions?: string;
    medications?: string;
    allergies?: string;
  };
  familyRelationships?: Array<{
    relationshipId: string;
    relatedMemberId: string;
    relationshipType: string;
    forwardRelation: string;
    reverseRelation: string;
  }>;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

// User/Auth types for access control
export interface User {
  userId: string;
  email: string;
  role: "superadmin" | "clubadmin" | "member";
  clubId?: string; // For club admins and members
  memberId?: string; // For members
  name?: string;
}

export interface AccessControlContext {
  user: User;
  requestedClubId: string;
  requestedMemberId?: string;
}

// Helper function to generate default membership dates
export function getDefaultMembershipDates(): {
  currentPeriodStart: string;
  currentPeriodEnd: string;
} {
  const now = new Date();
  const currentYear = now.getFullYear();

  return {
    currentPeriodStart: `${currentYear}-01-01`,
    currentPeriodEnd: `${currentYear}-12-31`,
  };
}

// Helper function to generate renewal dates
export function getRenewalDates(targetYear?: number): {
  periodStart: string;
  periodEnd: string;
} {
  const year = targetYear || new Date().getFullYear() + 1;

  return {
    periodStart: `${year}-01-01`,
    periodEnd: `${year}-12-31`,
  };
}

// Helper function to check if membership is expired
export function isMembershipExpired(membership: Membership): boolean {
  const today = new Date();
  const endDate = new Date(membership.currentPeriodEnd);
  return today > endDate;
}

// Helper function to check if membership is expiring soon (within 30 days)
export function isMembershipExpiringSoon(membership: Membership): boolean {
  const today = new Date();
  const endDate = new Date(membership.currentPeriodEnd);
  const daysUntilExpiry = Math.ceil(
    (endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );
  return daysUntilExpiry > 0 && daysUntilExpiry <= 30;
}
