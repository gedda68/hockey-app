// types/member.ts - Updated with Middle Name and Related Members

export interface RelatedMember {
  id: string; // Internal ID for managing in UI
  memberId?: string; // If linked to existing member (e.g., "CHC-0000123")
  name: string; // Name of related member
  relationshipType: string; // Config ID (e.g., "relationship-parent", "relationship-sibling")
}

export interface PersonalInformation {
  salutation?: string; // Config ID (e.g., "salutation-mr")
  firstName: string;
  middleName?: string; // NEW: Middle name (optional)
  lastName: string;
  displayName: string;
  dateOfBirth: string;
  gender: string; // Config ID (e.g., "gender-male")
  photoUrl?: string;
  relatedMembers?: RelatedMember[]; // NEW: Related family members
}

export interface Member {
  memberId: string; // Auto-generated (e.g., "CHC-0000001")
  clubId: string;
  associationId?: string;

  personalInfo: PersonalInformation;

  contact: {
    email: string;
    phone?: string;
    mobile?: string;
    emergencyContact: {
      name: string;
      relationship: string; // Config ID
      phone: string;
      email?: string;
    };
  };

  address: {
    street: string;
    suburb: string;
    state: string;
    postcode: string;
    country: string;
  };

  membership: {
    joinDate: string;
    membershipTypes: string[];
    status: "Active" | "Inactive" | "Suspended" | "Life";
    expiryDate?: string;
    renewalDate?: string;
  };

  roles: string[];
  teams: any[];
  userId?: string;

  medical?: {
    conditions?: string;
    medications?: string;
    allergies?: string;
    doctorName?: string;
    doctorPhone?: string;

    medicare?: {
      number?: string;
      referenceNumber?: string;
      expiryDate?: string;
      cardColor?: "green" | "blue" | "yellow";
    };

    privateHealth?: {
      hasInsurance: boolean;
      provider?: string;
      membershipNumber?: string;
      policyType?: "hospital-only" | "extras-only" | "combined";
      coverLevel?: "basic" | "bronze" | "silver" | "gold";
      expiryDate?: string;
      ambulanceCover?: boolean;
      emergencyNumber?: string;
      notes?: string;
    };

    additionalNotes?: string;
  };

  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// Example Member with Related Members
export const exampleMemberWithFamily = {
  memberId: "CHC-0000001",
  clubId: "club-commercial-hc",
  associationId: "assoc-brisbane-hockey",

  personalInfo: {
    salutation: "salutation-mr",
    firstName: "John",
    middleName: "David", // ← Middle name
    lastName: "Smith",
    displayName: "John David Smith",
    dateOfBirth: "1990-05-15",
    gender: "gender-male",

    // Related family members
    relatedMembers: [
      {
        id: "rel-1",
        memberId: "CHC-0000002", // Jane is also a member
        name: "Jane Smith",
        relationshipType: "relationship-spouse",
      },
      {
        id: "rel-2",
        memberId: "CHC-0000015", // Tommy is also a member
        name: "Tommy Smith",
        relationshipType: "relationship-child",
      },
      {
        id: "rel-3",
        // Sarah is not a member yet, but we track the relationship
        name: "Sarah Smith",
        relationshipType: "relationship-child",
      },
    ],
  },

  contact: {
    email: "john.smith@example.com",
    mobile: "0400 123 456",
    emergencyContact: {
      name: "Jane Smith",
      relationship: "relationship-spouse",
      phone: "0400 987 654",
      email: "jane.smith@example.com",
    },
  },

  address: {
    street: "123 Main Street",
    suburb: "Newmarket",
    state: "QLD",
    postcode: "4051",
    country: "Australia",
  },

  membership: {
    joinDate: "2024-01-01",
    membershipTypes: ["type-senior-playing"],
    status: "Active",
  },

  roles: ["role-player"],
  teams: [],

  medical: {
    conditions: "None",
    medicare: {
      number: "2345 67890 1",
      referenceNumber: "1",
      expiryDate: "2026-12",
      cardColor: "green",
    },
    privateHealth: {
      hasInsurance: true,
      provider: "BUPA",
      membershipNumber: "123456789",
      policyType: "combined",
      coverLevel: "silver",
      expiryDate: "2026-06-30",
      ambulanceCover: true,
    },
  },

  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

// Database Schema
export const memberSchemaUpdated = {
  memberId: String,
  clubId: String,
  associationId: String,

  personalInfo: {
    salutation: String,
    firstName: String,
    middleName: String, // ← NEW
    lastName: String,
    displayName: String,
    dateOfBirth: String,
    gender: String,
    photoUrl: String,

    relatedMembers: [
      // ← NEW
      {
        id: String,
        memberId: String, // Optional - if linked to existing member
        name: String,
        relationshipType: String,
      },
    ],
  },

  contact: {
    email: String,
    phone: String,
    mobile: String,
    emergencyContact: {
      name: String,
      relationship: String,
      phone: String,
      email: String,
    },
  },

  address: {
    street: String,
    suburb: String,
    state: String,
    postcode: String,
    country: String,
  },

  membership: {
    joinDate: String,
    membershipTypes: [String],
    status: String,
    expiryDate: String,
    renewalDate: String,
  },

  roles: [String],
  teams: [Object],
  userId: String,

  medical: {
    conditions: String,
    medications: String,
    allergies: String,
    doctorName: String,
    doctorPhone: String,

    medicare: {
      number: String,
      referenceNumber: String,
      expiryDate: String,
    },

    privateHealth: {
      hasInsurance: Boolean,
      provider: String,
      membershipNumber: String,
      expiryDate: String,

      notes: String,
    },

    additionalNotes: String,
  },

  notes: String,
  createdAt: Date,
  updatedAt: Date,
};
