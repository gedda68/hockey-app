// types/player.types.ts
// COMPLETE: All player types with Medical, Club, Documents enhancements

// ============================================
// UTILITY FUNCTIONS
// ============================================

export const calculateAge = (dateOfBirth: string): number => {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }

  return age;
};

export const isMinor = (dateOfBirth: string): boolean => {
  return calculateAge(dateOfBirth) < 18;
};

// ============================================
// INTERFACES & TYPES
// ============================================

// Emergency Contact
export interface EmergencyContact {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  email: string;
  linkedMemberId?: string; // Links to Members collection
}

// Guardian (for minors)
export interface Guardian {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  email: string;
  isPrimary: boolean;
  linkedMemberId?: string; // Links to Members collection
}

// Injury Record (for medical history)
export interface InjuryRecord {
  id: string;
  date: string;
  type: string; // concussion, fracture, sprain, ligament, muscle, joint, cut, bruise, other
  description: string;
  treatment: string;
  recoveryPeriod: string;
}

// Medical Information
export interface Medical {
  conditions: string;
  allergies: string;
  medications: string;
  bloodType?: string; // A+, A-, B+, B-, AB+, AB-, O+, O-
  doctorName: string;
  doctorPhone: string;
  doctorPractice?: string; // GP clinic/practice name
  healthFundName: string;
  healthFundNumber: string;
  medicareNumber: string;
  injuryHistory?: InjuryRecord[]; // Previous hockey injuries
}

// Club Transfer Record (for transfer history)
export interface ClubTransfer {
  id: string;
  clubName: string;
  fromDate: string;
  toDate: string;
  transferType: "transfer" | "dual-registration" | "loan" | "junior" | "other";
  notes: string;
}

// Club Information
export interface Club {
  registrationDate?: string; // When they joined this club
  registrationEndDate?: string; // When registration expires
  registrationNumber?: string; // Global sequential number
  memberNumber?: string; // Read-only from member record
  transferHistory?: ClubTransfer[]; // Previous clubs
}

// Consent & Permissions
export interface Consents {
  photoConsent: boolean; // Can use photo in marketing
  mediaConsent: boolean; // Can appear in videos/social media
  transportConsent: boolean; // Can travel with other parents
  firstAidConsent: boolean; // Can administer first aid (REQUIRED)
  emergencyTreatmentConsent: boolean; // Can authorize emergency treatment (REQUIRED)
}

// Player History Record
export interface PlayerHistory {
  id: string;
  season: string; // e.g., "2024"
  clubId?: string; // Link to club
  clubName: string; // Club name for display
  teamName?: string; // Team name (optional)
  division?: string; // Division/grade (optional)
  position?: string; // Playing position
  startDate?: string; // When they joined this club
  endDate?: string; // When they left (blank if current)
  gamesPlayed?: number; // Number of games
  goals?: number; // Goals scored
  assists?: number; // Assists
  notes?: string; // Additional notes
}

// Player Status & Registration
export interface PlayerStatus {
  current: "active" | "inactive" | "pending" | "suspended" | "archived";
  registrationDate: string; // Current season start
  expiryDate: string; // Registration expiry
  renewalReminderDate: string; // When to send renewal reminder
  seasons?: string[]; // Past seasons played
}

// Note/History Entry
export interface Note {
  id: string;
  type: "admin" | "behavioral" | "achievement" | "coaching" | "medical";
  date: string;
  author: string;
  content: string;
  private: boolean; // Visible to admins/coaches only
}

// Player Document Types
export type PlayerDocument = {
  id: string;
  type:
    | "birth_certificate"
    | "photo"
    | "medical_clearance"
    | "concussion_baseline" // Baseline concussion test (IMPORTANT for hockey)
    | "waiver_consent" // Signed waiver and consent forms
    | "insurance_certificate" // Personal sports insurance
    | "transfer_certificate" // Transfer clearance from previous club
    | "passport_id" // For international tournaments
    | "vaccination_record" // Vaccination records
    | "other";
  name: string;
  url: string;
  uploadedAt: string;
  size?: number; // File size in bytes
};

export interface TournamentHistoryEntry {
  id: string;
  season: string;
  ageGroup: string;
  tournamentId?: string;
  tournamentTitle: string;
  tournamentLocation?: string;
  tournamentStartDate?: string;
  nominatedDate: string;
  nominationStatus: "pending" | "accepted" | "withdrawn" | "rejected" | "played";
  feeId?: string;
}

export interface FeeRecord {
  id: string;
  date: string;
  type: "nomination" | "registration" | "association" | "other";
  description: string;
  amount: number;        // AUD dollars
  currency: string;      // "AUD"
  status: "pending" | "paid" | "overdue" | "waived" | "refunded";
  paymentMethod?: "stripe" | "paypal" | "cash" | "bank_transfer" | "other";
  transactionId?: string;
  paidDate?: string;
  linkedTournamentId?: string;
  notes?: string;
}

export interface DisciplinaryRecord {
  id: string;
  date: string;
  type: "yellow_card" | "red_card" | "suspension" | "warning" | "other";
  competition?: string;
  reason: string;
  duration?: string;
  endDate?: string;
  isActive: boolean;
  imposedBy?: string;
  notes?: string;
}

// Main Player Form Data
export interface PlayerFormData {
  // System Fields
  playerId: string;
  linkedMemberId?: string | null; // Links to Members collection

  // Personal Information
  firstName: string;
  lastName: string;
  preferredName: string;
  dateOfBirth: string;
  gender: string;

  // Contact Information
  email: string;
  phone: string;

  // Address
  street: string;
  suburb: string;
  city: string;
  state: string;
  postcode: string;
  country: string;

  // Club & Registration
  clubId: string;
  club: Club;

  // Photo
  photo: string;

  // Medical Information
  medical: Medical;

  // Emergency Contacts & Guardians
  emergencyContacts: EmergencyContact[];
  guardians: Guardian[];

  // Documents
  documents: PlayerDocument[];

  // Consents & Permissions
  consents?: Consents;

  // Player Status
  status?: PlayerStatus;

  // Notes & History
  notes?: Note[];

  // Play History & Teams
  playHistory?: PlayerHistory[];
  teamIds?: string[];
  primaryPosition?: string;
  secondaryPosition?: string;

  // Rep Tournament & Fee History
  tournamentHistory?: TournamentHistoryEntry[];
  feeHistory?: FeeRecord[];
  disciplinaryHistory?: DisciplinaryRecord[];
}

// Base Section Props (used by all section components)
export interface BaseSectionProps {
  formData: PlayerFormData;
  onChange: (field: string, value: any) => void;
  errors: Record<string, string>;
}

// ============================================
// CONSTANTS
// ============================================

// Relationship Options (for emergency contacts and guardians)
export const RELATIONSHIPS = [
  "Parent",
  "Mother",
  "Father",
  "Guardian",
  "Sibling",
  "Brother",
  "Sister",
  "Grandparent",
  "Grandmother",
  "Grandfather",
  "Aunt",
  "Uncle",
  "Cousin",
  "Spouse",
  "Partner",
  "Friend",
  "Other",
] as const;

// Blood Type Options
export const BLOOD_TYPES = [
  "A+",
  "A-",
  "B+",
  "B-",
  "AB+",
  "AB-",
  "O+",
  "O-",
] as const;

// Injury Types
export const INJURY_TYPES = [
  "concussion",
  "fracture",
  "sprain",
  "ligament",
  "muscle",
  "joint",
  "cut",
  "bruise",
  "other",
] as const;

// Transfer Types
export const TRANSFER_TYPES = [
  "transfer",
  "dual-registration",
  "loan",
  "junior",
  "other",
] as const;

// Document Types
export const DOCUMENT_TYPES = [
  "birth_certificate",
  "photo",
  "medical_clearance",
  "concussion_baseline",
  "waiver_consent",
  "insurance_certificate",
  "transfer_certificate",
  "passport_id",
  "vaccination_record",
  "other",
] as const;

// Player Status Types
export const PLAYER_STATUS = [
  "active",
  "inactive",
  "pending",
  "suspended",
  "archived",
] as const;

// Note Types
export const NOTE_TYPES = [
  "admin",
  "behavioral",
  "achievement",
  "coaching",
  "medical",
] as const;

// ============================================
// DEFAULT DATA
// ============================================

export const DEFAULT_PLAYER_DATA: PlayerFormData = {
  // System Fields
  playerId: "",
  linkedMemberId: null,

  // Personal Information
  firstName: "",
  lastName: "",
  preferredName: "",
  dateOfBirth: "",
  gender: "",

  // Contact Information
  email: "",
  phone: "",

  // Address
  street: "",
  suburb: "",
  city: "",
  state: "",
  postcode: "",
  country: "Australia",

  // Club & Registration
  clubId: "",
  club: {
    registrationDate: "",
    registrationEndDate: "",
    registrationNumber: "",
    memberNumber: "",
    transferHistory: [],
  },

  // Photo
  photo: "",

  // Medical Information
  medical: {
    conditions: "",
    allergies: "",
    medications: "",
    bloodType: "",
    doctorName: "",
    doctorPhone: "",
    doctorPractice: "",
    healthFundName: "",
    healthFundNumber: "",
    medicareNumber: "",
    injuryHistory: [],
  },

  // Emergency Contacts & Guardians
  emergencyContacts: [],
  guardians: [],

  // Documents
  documents: [],

  // Consents & Permissions
  consents: {
    photoConsent: false,
    mediaConsent: false,
    transportConsent: false,
    firstAidConsent: false,
    emergencyTreatmentConsent: false,
  },

  // Player Status
  status: {
    current: "pending",
    registrationDate: "",
    expiryDate: "",
    renewalReminderDate: "",
    seasons: [],
  },

  // Notes & History
  notes: [],

  // Play History & Teams
  playHistory: [],
  teamIds: [],
  primaryPosition: "",
  secondaryPosition: "",

  // Rep Tournament & Fee History
  tournamentHistory: [],
  feeHistory: [],
  disciplinaryHistory: [],
};

// ============================================
// VALIDATION HELPERS
// ============================================

export const validatePlayerData = (
  data: PlayerFormData,
): Record<string, string> => {
  const errors: Record<string, string> = {};

  // Personal Information - Required
  if (!data.firstName?.trim()) {
    errors.firstName = "First name is required";
  }
  if (!data.lastName?.trim()) {
    errors.lastName = "Last name is required";
  }
  if (!data.dateOfBirth) {
    errors.dateOfBirth = "Date of birth is required";
  }
  if (!data.gender) {
    errors.gender = "Gender is required";
  }

  // Address - Required
  if (!data.street?.trim()) {
    errors.street = "Street address is required";
  }
  if (!data.suburb?.trim()) {
    errors.suburb = "Suburb is required";
  }
  if (!data.postcode?.trim()) {
    errors.postcode = "Postcode is required";
  }

  // Club - Required
  if (!data.clubId) {
    errors.clubId = "Club selection is required";
  }

  // Emergency Contact - Required (at least one)
  if (data.emergencyContacts.length === 0) {
    errors.emergencyContacts = "At least one emergency contact is required";
  } else {
    // Validate each emergency contact
    data.emergencyContacts.forEach((contact, index) => {
      if (!contact.name?.trim()) {
        errors[`emergencyContact_${index}_name`] = "Contact name is required";
      }
      if (!contact.relationship?.trim()) {
        errors[`emergencyContact_${index}_relationship`] =
          "Relationship is required";
      }
      if (!contact.phone?.trim()) {
        errors[`emergencyContact_${index}_phone`] = "Contact phone is required";
      }
    });
  }

  // Guardians - Required for minors
  if (data.dateOfBirth && isMinor(data.dateOfBirth)) {
    if (data.guardians.length === 0) {
      errors.guardians =
        "At least one guardian is required for players under 18";
    } else {
      // Validate each guardian
      data.guardians.forEach((guardian, index) => {
        if (!guardian.name?.trim()) {
          errors[`guardian_${index}_name`] = "Guardian name is required";
        }
        if (!guardian.relationship?.trim()) {
          errors[`guardian_${index}_relationship`] = "Relationship is required";
        }
        if (!guardian.phone?.trim()) {
          errors[`guardian_${index}_phone`] = "Guardian phone is required";
        }
        if (!guardian.email?.trim()) {
          errors[`guardian_${index}_email`] = "Guardian email is required";
        }
      });

      // Ensure at least one primary guardian
      const hasPrimary = data.guardians.some((g) => g.isPrimary);
      if (!hasPrimary) {
        errors.guardians_primary =
          "At least one guardian must be set as primary";
      }
    }
  }

  // Documents - Birth certificate and photo required
  const hasBirthCert = data.documents.some(
    (d) => d.type === "birth_certificate" && d.url,
  );
  const hasPhoto = data.documents.some((d) => d.type === "photo" && d.url);

  if (!hasBirthCert) {
    errors.documents_birth = "Birth certificate is required";
  }
  if (!hasPhoto) {
    errors.documents_photo = "Player photo is required";
  }

  // Email validation (if provided)
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.email = "Please enter a valid email address";
  }

  // Phone validation (basic Australian format)
  if (
    data.phone &&
    !/^(\+?61|0)[2-478]( ?\d){8}$/.test(data.phone.replace(/\s/g, ""))
  ) {
    errors.phone = "Please enter a valid Australian phone number";
  }

  // Postcode validation (Australian)
  if (data.postcode && !/^\d{4}$/.test(data.postcode)) {
    errors.postcode = "Postcode must be 4 digits";
  }

  return errors;
};

// ============================================
// HELPER FUNCTIONS
// ============================================

// Format date for display
export const formatDate = (dateString: string): string => {
  if (!dateString) return "N/A";
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-AU", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "Invalid Date";
  }
};

// Format file size
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
};

// Get age display string
export const getAgeDisplay = (dateOfBirth: string): string => {
  if (!dateOfBirth) return "";
  const age = calculateAge(dateOfBirth);
  return `${age} ${isMinor(dateOfBirth) ? "(Minor)" : "(Adult)"}`;
};

// Get years with club
export const getYearsWithClub = (registrationDate: string): string => {
  if (!registrationDate) return "";

  const regDate = new Date(registrationDate);
  const now = new Date();
  const years = now.getFullYear() - regDate.getFullYear();
  const months = now.getMonth() - regDate.getMonth();

  if (years === 0) {
    return months === 0
      ? "Less than a month"
      : `${months} month${months !== 1 ? "s" : ""}`;
  } else if (years === 1 && months < 0) {
    return "Less than a year";
  } else {
    const totalYears = months < 0 ? years - 1 : years;
    return `${totalYears} year${totalYears !== 1 ? "s" : ""}`;
  }
};

// Get document type label
export const getDocumentTypeLabel = (type: PlayerDocument["type"]): string => {
  const labels: Record<PlayerDocument["type"], string> = {
    birth_certificate: "Birth Certificate",
    photo: "Player Photo",
    medical_clearance: "Medical Clearance",
    concussion_baseline: "Concussion Baseline Test",
    waiver_consent: "Waiver/Consent Form",
    insurance_certificate: "Insurance Certificate",
    transfer_certificate: "Transfer Certificate",
    passport_id: "Passport/ID",
    vaccination_record: "Vaccination Records",
    other: "Other Document",
  };
  return labels[type] || "Unknown";
};

// Check if player has medical alerts
export const hasMedicalAlerts = (medical: Medical): boolean => {
  return !!(
    medical.allergies?.trim() ||
    medical.conditions?.trim() ||
    medical.medications?.trim()
  );
};

// Get medical alert summary
export const getMedicalAlertSummary = (medical: Medical): string[] => {
  const alerts: string[] = [];
  if (medical.allergies?.trim()) {
    alerts.push(`Allergies: ${medical.allergies}`);
  }
  if (medical.conditions?.trim()) {
    alerts.push(`Conditions: ${medical.conditions}`);
  }
  if (medical.medications?.trim()) {
    alerts.push(`Medications: ${medical.medications}`);
  }
  return alerts;
};

// Export all types
export type {
  PlayerFormData,
  BaseSectionProps,
  EmergencyContact,
  Guardian,
  Medical,
  Club,
  PlayerDocument,
  InjuryRecord,
  ClubTransfer,
  Consents,
  PlayerStatus,
  Note,
  TournamentHistoryEntry,
  FeeRecord,
  DisciplinaryRecord,
};
