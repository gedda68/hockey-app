// Complete Member Schema with Healthcare (Australian)

export interface Member {
  // ===== IDENTITY =====
  memberId: string;
  clubId: string;

  // ===== PERSONAL INFORMATION =====
  personalInfo: {
    firstName: string;
    lastName: string;
    displayName: string;
    dateOfBirth: string;
    gender: "Male" | "Female" | "Other" | "Prefer not to say";
    photoUrl?: string | null;
  };

  // ===== CONTACT INFORMATION =====
  contact: {
    primaryEmail: string;
    emailOwnership: "Own" | "Shared" | "Parent";
    additionalEmails: {
      email: string;
      type: "Personal" | "Work" | "School" | "Other";
      preferred: boolean;
    }[];
    phone: string;
    mobile: string;
  };

  // ===== ADDRESS =====
  address: {
    street: string;
    suburb: string;
    state: string;
    postcode: string;
    country: string;
  };

  // ===== HEALTHCARE (AUSTRALIAN) =====
  healthcare: {
    // Medicare
    medicare?: {
      number: string; // 10 digit number
      position: string; // 1-9 (position on card)
      expiryMonth: string; // "01" to "12"
      expiryYear: string; // "2025" (4 digits)
    } | null;

    // Private Health Insurance
    privateHealth?: {
      provider: string; // "Bupa", "Medibank", "HCF", etc.
      membershipNumber: string;
      expiryDate?: string; // ISO date or MM/YYYY
    } | null;
  };

  // ===== EMERGENCY CONTACTS (Up to 3) =====
  emergencyContacts: {
    contactId: string; // "emerg-1", "emerg-2", "emerg-3"
    priority: number; // 1 = primary, 2 = secondary, 3 = tertiary
    name: string;
    relationship: string; // Ref to config_relationships
    phone: string;
    mobile: string;
    email?: string;
    address?: {
      street: string;
      suburb: string;
      state: string;
      postcode: string;
    };
  }[];

  // ===== SOCIAL MEDIA =====
  socialMedia: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    tiktok?: string;
    linkedin?: string;
  };

  // ===== COMMUNICATION PREFERENCES =====
  communicationPreferences: {
    preferredMethod: "Email" | "SMS" | "App" | "Social";
    emailFrequency: "All" | "Daily Digest" | "Weekly" | "Important Only";
    smsNotifications: boolean;
    pushNotifications: boolean;
    socialMediaUpdates: boolean;
  };

  // ===== MEMBERSHIP DETAILS =====
  membership: {
    joinDate: string;
    membershipType: string;
    status: "Active" | "Inactive" | "Suspended" | "Life";
    expiryDate?: string | null;
    renewalDate?: string | null;
  };

  // ===== ROLES =====
  roles: string[];

  // ===== PLAYER INFO =====
  playerInfo?: {
    primaryPosition: string;
    secondaryPosition?: string;
    jerseyNumber?: number | null;
    preferredFoot?: "Left" | "Right" | "Both" | null;
  };

  // ===== TEAMS =====
  teams: {
    teamId: string;
    teamName: string;
    division: string;
    role: string;
    season: string;
    jerseyNumber?: number;
  }[];

  // ===== FAMILY =====
  family?: {
    familyId: string;
    relationship: string;
    isPrimaryContact: boolean;
  } | null;

  // ===== USER ACCOUNT =====
  userId?: string | null;

  // ===== MEDICAL =====
  medical?: {
    conditions: string;
    medications: string;
    allergies: string;
    doctorName: string;
    doctorPhone: string;
    bloodType?: string;
    organDonor?: boolean;
  };

  // ===== NOTES =====
  notes?: string;

  // ===== METADATA =====
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

// ===== CONFIG RELATIONSHIPS COLLECTION =====
export interface ConfigRelationship {
  relationshipId: string; // "rel-parent", "rel-spouse", etc.
  name: string; // "Parent", "Spouse", "Friend"
  category: "Family" | "Friend" | "Professional" | "Other";
  isActive: boolean;
  displayOrder: number;

  // Usage tracking
  usageCount?: number; // How many times used
  lastUsed?: string;

  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

// ===== HELPER FUNCTIONS =====

// Format Medicare number for display
export function formatMedicareNumber(number: string): string {
  // Format: XXXX XXXXX X
  if (number.length !== 10) return number;
  return `${number.slice(0, 4)} ${number.slice(4, 9)} ${number.slice(9)}`;
}

// Validate Medicare number (basic check)
export function validateMedicareNumber(number: string): boolean {
  // Remove spaces
  const clean = number.replace(/\s/g, "");

  // Must be 10 digits
  if (!/^\d{10}$/.test(clean)) return false;

  // First digit cannot be 0
  if (clean[0] === "0") return false;

  return true;
}

// Format Medicare expiry
export function formatMedicareExpiry(month: string, year: string): string {
  return `${month}/${year}`;
}

// Check if Medicare is expired
export function isMedicareExpired(month: string, year: string): boolean {
  const expiry = new Date(parseInt(year), parseInt(month) - 1);
  const now = new Date();
  return expiry < now;
}

// Get primary emergency contact
export function getPrimaryEmergencyContact(member: Member) {
  return (
    member.emergencyContacts.find((c) => c.priority === 1) ||
    member.emergencyContacts[0] ||
    null
  );
}

// Sort emergency contacts by priority
export function sortEmergencyContacts(contacts: Member["emergencyContacts"]) {
  return [...contacts].sort((a, b) => a.priority - b.priority);
}

// Validate emergency contacts
export function validateEmergencyContacts(
  contacts: Member["emergencyContacts"]
): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (contacts.length === 0) {
    errors.push("At least one emergency contact is required");
  }

  if (contacts.length > 3) {
    errors.push("Maximum 3 emergency contacts allowed");
  }

  // Check for duplicate priorities
  const priorities = contacts.map((c) => c.priority);
  const uniquePriorities = new Set(priorities);
  if (priorities.length !== uniquePriorities.size) {
    errors.push("Each emergency contact must have a unique priority");
  }

  // Validate each contact
  contacts.forEach((contact, index) => {
    if (!contact.name) {
      errors.push(`Contact ${index + 1}: Name is required`);
    }
    if (!contact.relationship) {
      errors.push(`Contact ${index + 1}: Relationship is required`);
    }
    if (!contact.phone && !contact.mobile) {
      errors.push(
        `Contact ${index + 1}: At least one phone number is required`
      );
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Format private health provider for display
export function formatHealthProvider(provider: string, number: string): string {
  return `${provider} - ${number}`;
}

// Check if healthcare info is complete
export function isHealthcareComplete(member: Member): {
  hasMedicare: boolean;
  hasPrivateHealth: boolean;
  isComplete: boolean;
} {
  const hasMedicare = !!member.healthcare?.medicare?.number;
  const hasPrivateHealth = !!member.healthcare?.privateHealth?.membershipNumber;

  return {
    hasMedicare,
    hasPrivateHealth,
    isComplete: hasMedicare || hasPrivateHealth, // At least one required
  };
}
