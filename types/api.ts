/**
 * Shared API types used across admin API routes.
 * Replaces ad-hoc `any` casts in route handlers.
 */

export type {
  MembershipCategory,
  PlayingCategory,
  UmpireQualification,
  UmpireQualificationLevel,
} from "@/lib/types/roles";

/** Minimal shape returned by MongoDB for any document */
export interface MongoDoc {
  _id: unknown;
  [key: string]: unknown;
}

/** Club document as stored in MongoDB */
export interface ClubDoc extends MongoDoc {
  id: string;
  slug?: string;
  name: string;
  shortName?: string;
  active: boolean;
  parentAssociationId?: string;
  region?: string;
  state?: string;
  colors: { primary: string; secondary: string; accent?: string };
  address: { street?: string; suburb?: string; state?: string; postcode?: string; country?: string };
  contact: { email?: string; phone?: string; website?: string };
  memberSequence?: number;
}

/** Member document as stored in MongoDB */
export interface MemberDoc extends MongoDoc {
  memberId: string;
  clubId: string;
  associationId?: string | null;
  personalInfo: {
    salutation?: string | null;
    firstName: string;
    lastName: string;
    displayName?: string;
    dateOfBirth?: string;
    gender?: string;
    photoUrl?: string | null;
  };
  contact: {
    email?: string;
    primaryEmail?: string;
    phone?: string | null;
    mobile?: string | null;
    emergencyContact?: {
      name: string;
      relationship?: string;
      phone: string;
      email?: string | null;
    };
  };
  address?: {
    street?: string;
    suburb?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
  membership?: {
    status?: string;
    /** One or more membership categories — use validateMembershipCategories() before saving */
    membershipTypes?: import("@/lib/types/roles").MembershipCategory[];
    /** Mutually exclusive playing-age bracket derived from membershipTypes */
    playingCategory?: import("@/lib/types/roles").PlayingCategory;
    joinDate?: string;
    expiryDate?: string | null;
    renewalDate?: string | null;
  };
  /** Scoped role assignments — see RoleAssignment in lib/types/roles.ts */
  roles?: import("@/lib/types/roles").RoleAssignment[];
  /** Umpire accreditations — only present when member holds an "umpire" membership category */
  umpireQualifications?: import("@/lib/types/roles").UmpireQualification[];
  teams?: string[];
  userId?: string | null;
  medical?: unknown;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string | null;
}

/** Player document as stored in MongoDB */
export interface PlayerDoc extends MongoDoc {
  playerId: string;
  firstName: string;
  lastName: string;
  preferredName?: string | null;
  dateOfBirth?: string;
  gender?: string | null;
  clubId?: string | null;
  clubName?: string | null;
  linkedMemberId?: string | null;
  active?: boolean;
  status?: { current?: string };
  emergencyContacts?: Array<{
    id?: string;
    name?: string;
    relationship?: string;
    phone?: string;
    email?: string;
  }>;
  medical?: {
    conditions?: string;
    allergies?: string;
    medications?: string;
    bloodType?: string;
    doctorName?: string;
    doctorPhone?: string;
  };
}

/** Association document as stored in MongoDB */
export interface AssociationDoc extends MongoDoc {
  associationId: string;
  code: string;
  name: string;
  fullName: string;
  level?: number;
  hierarchy?: string[];
  parentAssociationId?: string;
  status?: string;
  region?: string;
  state?: string;
}

/** Generic paginated API response */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
