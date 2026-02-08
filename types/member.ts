// types/member.ts
// Member type definitions

export interface Member {
  // Identity
  memberId: string; // "CHC-0000001"
  clubId: string; // Reference to club
  associationId?: string; // Reference to association

  // Personal Information
  personalInfo: {
    salutation?: string; // "Mr", "Mrs", "Ms", etc.
    firstName: string;
    lastName: string;
    displayName: string; // Auto-generated or custom
    dateOfBirth: string; // ISO date string
    gender: string; // Reference to gender config
    photoUrl?: string;
  };

  // Contact Information
  contact: {
    email: string;
    phone?: string;
    mobile?: string;
    emergencyContact: {
      name: string;
      relationship: string; // Reference to relationship-type config
      phone: string;
      email?: string;
    };
  };

  // Address
  address: {
    street: string;
    suburb: string;
    state: string;
    postcode: string;
    country: string;
  };

  // Membership Details
  membership: {
    joinDate: string; // ISO date
    membershipTypes: string[]; // Array of membership type IDs
    status: "Active" | "Inactive" | "Suspended" | "Life";
    expiryDate?: string;
    renewalDate?: string;
  };

  // Roles (what they DO in the club)
  roles: string[]; // Array of role IDs from member_roles

  // Teams/Divisions
  teams: {
    teamId: string;
    teamName: string;
    division?: string;
    role: string; // "Player", "Coach", "Manager"
    season: string;
    jerseyNumber?: number;
  }[];

  // User Account Link (optional)
  userId?: string | null; // Link to users collection

  // Medical Information (optional)
  medical?: {
    conditions?: string;
    medications?: string;
    allergies?: string;
    doctorName?: string;
    doctorPhone?: string;
    healthcareCard?: {
      number: string;
      expiryDate: string;
    };
  };

  // Notes
  notes?: string;

  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy?: string | null;
}

// API Request types
export interface CreateMemberRequest {
  clubId: string;
  associationId?: string;
  personalInfo: {
    salutation?: string;
    firstName: string;
    lastName: string;
    displayName?: string;
    dateOfBirth: string;
    gender: string;
    photoUrl?: string;
  };
  contact: {
    email: string;
    phone?: string;
    mobile?: string;
    emergencyContact: {
      name: string;
      relationship: string;
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
    joinDate?: string;
    membershipTypes: string[];
    status?: "Active" | "Inactive" | "Suspended" | "Life";
  };
  roles?: string[];
  teams?: {
    teamId: string;
    teamName: string;
    division?: string;
    role: string;
    season: string;
    jerseyNumber?: number;
  }[];
  medical?: {
    conditions?: string;
    medications?: string;
    allergies?: string;
    doctorName?: string;
    doctorPhone?: string;
    healthcareCard?: {
      number: string;
      expiryDate: string;
    };
  };
  notes?: string;
}

export interface UpdateMemberRequest extends Partial<CreateMemberRequest> {
  memberId: string;
}

// API Response types
export interface MembersListResponse {
  members: Member[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface MemberResponse {
  member: Member;
}

// Filter/Query types
export interface MemberFilters {
  clubId?: string;
  associationId?: string;
  status?: "Active" | "Inactive" | "Suspended" | "Life";
  membershipType?: string;
  role?: string;
  search?: string; // Search by name, email, member ID
  ageMin?: number;
  ageMax?: number;
}
