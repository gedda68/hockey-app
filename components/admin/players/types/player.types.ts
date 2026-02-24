// types/player.types.ts
// Central type definitions for Player forms and components

export interface Club {
  id: string;
  name: string;
  shortName: string;
}

export interface Team {
  id: string;
  name: string;
  clubId: string;
  division: string;
  season: string;
}

export interface Guardian {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  email: string;
  isPrimary: boolean;
}

export interface EmergencyContact {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  email?: string;
}

export interface MedicalInfo {
  conditions: string;
  allergies: string;
  medications: string;
  doctorName: string;
  doctorPhone: string;
  healthFundName: string;
  healthFundNumber: string;
  medicareNumber: string;
}

export interface PlayerDocument {
  id: string;
  type: "birth_certificate" | "photo" | "medical_clearance" | "other";
  name: string;
  url: string;
  uploadedAt: string;
}

export interface PlayerHistory {
  id: string;
  season: string;
  clubId: string;
  clubName: string;
  teamId?: string;
  teamName?: string;
  division?: string;
}

export interface PlayerFormData {
  // Personal Info
  playerId: string;
  firstName: string;
  lastName: string;
  preferredName: string;
  dateOfBirth: string;
  gender: "male" | "female" | "other";

  // Contact
  email: string;
  phone: string;

  // Address
  street: string;
  suburb: string;
  city: string;
  state: string;
  postcode: string;
  country: string;

  // Club/Team Association
  clubId: string;
  teamIds: string[];
  primaryPosition: string;
  secondaryPosition: string;

  // Medical
  medical: MedicalInfo;

  // Emergency Contacts
  emergencyContacts: EmergencyContact[];

  // Guardians (for minors)
  guardians: Guardian[];

  // Documents
  documents: PlayerDocument[];

  // History
  playHistory: PlayerHistory[];

  // Registration
  registrationStatus: "pending" | "approved" | "rejected" | "inactive";
  registrationDate: string;
  photo: string;

  // Status
  active: boolean;
}

export type SectionId =
  | "personal"
  | "club"
  | "medical"
  | "emergency"
  | "documents"
  | "history";

export interface SectionDefinition {
  id: SectionId;
  label: string;
  icon: any;
  desc: string;
}

export interface BaseSectionProps {
  formData: PlayerFormData;
  onChange: (field: string, value: any) => void;
  errors: Record<string, string>;
}

export interface ClubSectionProps extends BaseSectionProps {
  clubs: Club[];
  teams: Team[];
}

// Helper function to calculate age
export function calculateAge(dateOfBirth: string): number {
  const today = new Date();
  const birth = new Date(dateOfBirth);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

// Helper to check if player is a minor
export function isMinor(dateOfBirth: string): boolean {
  return calculateAge(dateOfBirth) < 18;
}

export const DEFAULT_PLAYER_DATA: PlayerFormData = {
  // Personal
  playerId: "",
  firstName: "",
  lastName: "",
  preferredName: "",
  dateOfBirth: "",
  gender: "male",

  // Contact
  email: "",
  phone: "",

  // Address
  street: "",
  suburb: "",
  city: "",
  state: "QLD",
  postcode: "",
  country: "Australia",

  // Club/Team
  clubId: "",
  teamIds: [],
  primaryPosition: "",
  secondaryPosition: "",

  // Medical
  medical: {
    conditions: "",
    allergies: "",
    medications: "",
    doctorName: "",
    doctorPhone: "",
    healthFundName: "",
    healthFundNumber: "",
    medicareNumber: "",
  },

  // Emergency Contacts
  emergencyContacts: [],

  // Guardians
  guardians: [],

  // Documents
  documents: [],

  // History
  playHistory: [],

  // Registration
  registrationStatus: "pending",
  registrationDate: new Date().toISOString(),
  photo: "",

  // Status
  active: true,
};

// Position options
export const POSITIONS = ["Striker", "Midfielder", "Defender", "Goalkeeper"];

// Relationship options for guardians/emergency contacts
export const RELATIONSHIPS = [
  "Husband",
  "Wife",
  "Mother",
  "Father",
  "Guardian",
  "Grandparent",
  "Aunt",
  "Uncle",
  "Sibling",
  "Other",
];
