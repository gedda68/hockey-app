// Database Schemas for Membership System

// ===== MEMBERS COLLECTION =====
export interface Member {
  // Identity
  memberId: string; // "CHC-0000001"
  clubId: string; // Reference to club

  // Personal Information
  personalInfo: {
    firstName: string;
    lastName: string;
    displayName: string;
    dateOfBirth: string; // ISO date
    gender: "Male" | "Female" | "Other" | "Prefer not to say";
    photoUrl?: string;
  };

  // Contact Information
  contact: {
    email: string;
    phone: string;
    mobile: string;
    emergencyContact: {
      name: string;
      relationship: string;
      phone: string;
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
    membershipType: string; // Ref to membership_types
    status: "Active" | "Inactive" | "Suspended" | "Life";
    expiryDate?: string;
    renewalDate?: string;
  };

  // Roles (what they DO in the club)
  roles: string[]; // Array of roleIds from member_roles

  // Teams/Divisions
  teams: {
    teamId: string;
    teamName: string;
    division: string;
    role: string; // "Player", "Coach", "Manager"
    season: string;
    jerseyNumber?: number;
  }[];

  // User Account Link (optional)
  userId?: string | null; // Link to users collection

  // Medical/Notes
  medical?: {
    conditions: string;
    medications: string;
    allergies: string;
    doctorName: string;
    doctorPhone: string;
  };

  // Notes
  notes?: string;

  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

// ===== USERS COLLECTION =====
export interface User {
  // Identity
  userId: string; // "user-xxxxx"
  email: string; // Login credential

  // Authentication (handled by auth system)
  passwordHash?: string; // If using custom auth
  emailVerified: boolean;
  lastLogin?: string;

  // Profile
  profile: {
    displayName: string;
    photoUrl?: string;
    timezone: string;
    locale: string;
  };

  // Permissions (what they can ACCESS in the app)
  permissions: {
    level: string; // Ref to permission_levels
    scope: string[]; // ["club-123", "team-456"]
    capabilities: string[]; // ["view_scores", "edit_team"]
  };

  // Linked Memberships
  memberships: {
    memberId: string; // Link to members collection
    clubId: string;
    primary: boolean; // Default club
  }[];

  // App Settings
  settings: {
    notifications: {
      email: boolean;
      push: boolean;
      sms: boolean;
    };
    privacy: {
      showEmail: boolean;
      showPhone: boolean;
      showInDirectory: boolean;
    };
  };

  // Metadata
  createdAt: string;
  updatedAt: string;
}

// ===== MEMBER ROLES COLLECTION =====
export interface MemberRole {
  roleId: string; // "role-player"
  name: string; // "Player"
  description: string;
  category: "Participant" | "Official" | "Administrator" | "Support";

  // Club-specific roles
  clubId?: string | null; // null = available to all clubs

  // Icon/Display
  icon?: string;
  color?: string;

  // Auto-granted permissions
  defaultPermissions: string[]; // ["view_fixtures", "update_availability"]

  // Status
  active: boolean;
  displayOrder: number;

  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

// ===== PERMISSION LEVELS COLLECTION =====
export interface PermissionLevel {
  levelId: string; // "level-coach"
  name: string; // "Coach"
  rank: number; // 30 (higher = more access)
  description: string;

  // What they can do
  capabilities: string[]; // ["view_all_teams", "edit_own_team"]

  // Inheritance
  inheritsFrom?: string | null; // "level-player"

  // Status
  active: boolean;

  // Metadata
  createdAt: string;
  updatedAt: string;
}

// ===== MEMBERSHIP TYPES COLLECTION =====
export interface MembershipType {
  typeId: string; // "type-junior"
  clubId?: string | null; // null = standard type for all clubs
  name: string; // "Junior"
  description: string;

  // Age restrictions
  minAge?: number;
  maxAge?: number;

  // Pricing
  annualFee?: number;
  currency: string;

  // Benefits
  benefits: string[];

  // Status
  active: boolean;
  displayOrder: number;

  // Metadata
  createdAt: string;
  updatedAt: string;
}

// ===== CAPABILITIES COLLECTION =====
export interface Capability {
  capabilityId: string; // "cap-edit-team"
  name: string; // "edit_team"
  displayName: string; // "Edit Team"
  description: string;
  category: "View" | "Edit" | "Manage" | "Admin";

  // What resource it applies to
  resource: string; // "team", "member", "fixture"

  // Status
  active: boolean;

  // Metadata
  createdAt: string;
}

// ===== HELPER FUNCTIONS =====

// Generate member ID
export function generateMemberId(
  clubShortName: string,
  sequence: number
): string {
  return `${clubShortName}-${sequence.toString().padStart(7, "0")}`;
}

// Check permission
export function hasCapability(user: User, capability: string): boolean {
  return (
    user.permissions.capabilities.includes(capability) ||
    user.permissions.level === "level-super-admin"
  );
}

// Check if user can access resource
export function canAccessResource(
  user: User,
  resourceType: string,
  resourceId: string
): boolean {
  // Super admin can access everything
  if (user.permissions.level === "level-super-admin") return true;

  // Check scope
  return user.permissions.scope.includes(resourceId);
}

// Get member's full name
export function getMemberFullName(member: Member): string {
  return (
    member.personalInfo.displayName ||
    `${member.personalInfo.firstName} ${member.personalInfo.lastName}`
  );
}

// Check if member has role
export function memberHasRole(member: Member, roleId: string): boolean {
  return member.roles.includes(roleId);
}

// Get member age
export function getMemberAge(member: Member): number {
  const birthDate = new Date(member.personalInfo.dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }
  return age;
}
