// types/association.types.ts
// Central type definitions for Association forms

export interface ParentAssociation {
  associationId: string;
  code: string;
  name: string;
  level: number;
}

export interface AssociationFormData {
  // Identity
  associationId: string;
  code: string;
  name: string;
  fullName: string;
  acronym: string;
  parentAssociationId: string;
  status: "active" | "inactive" | "suspended";

  // Contact
  primaryEmail: string;
  secondaryEmail: string;
  phone: string;
  mobile: string;
  website: string;

  // Address
  street: string;
  suburb: string;
  city: string;
  addressState: string;
  postcode: string;
  addressCountry: string;
  region: string;
  state: string;
  country: string;
  timezone: string;

  // Social Media
  facebook: string;
  instagram: string;
  twitter: string;

  // Branding
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  useAccentColor: boolean;

  // Fees & Positions
  fees: Fee[];
  positions: Position[];

  // Settings
  requiresApproval: boolean;
  autoApproveReturningPlayers: boolean;
  allowMultipleClubs: boolean;
  seasonStartMonth: number;
  seasonEndMonth: number;
  requiresInsurance: boolean;
  requiresMedicalInfo: boolean;
  requiresEmergencyContact: boolean;
}

export interface Fee {
  feeId: string;
  name: string;
  amount: number;
  category?: string;
  isActive: boolean;
}

export interface Position {
  positionId: string;
  title: string;
  description?: string;
  phone?: string;
  email?: string;
  isPaid: boolean;
  isActive: boolean;
}

export type SectionId =
  | "identity"
  | "contact"
  | "address"
  | "social"
  | "branding"
  | "fees"
  | "positions"
  | "settings";

export interface SectionDefinition {
  id: SectionId;
  label: string;
  icon: any; // Lucide icon component
  desc: string;
}

export interface BaseSectionProps {
  formData: AssociationFormData;
  onChange: (field: string, value: any) => void;
  errors: Record<string, string>;
}

export interface IdentitySectionProps extends BaseSectionProps {
  selectedLevel: number | "";
  onLevelChange: (level: number | "") => void;
  parentAssociations: ParentAssociation[];
  isEdit: boolean;
}

export const DEFAULT_FORM_DATA: AssociationFormData = {
  // Identity
  associationId: "",
  code: "",
  name: "",
  fullName: "",
  acronym: "",
  parentAssociationId: "",
  status: "active",

  // Contact
  primaryEmail: "",
  secondaryEmail: "",
  phone: "",
  mobile: "",
  website: "",

  // Address
  street: "",
  suburb: "",
  city: "",
  addressState: "QLD",
  postcode: "",
  addressCountry: "Australia",
  region: "",
  state: "QLD",
  country: "Australia",
  timezone: "Australia/Brisbane",

  // Social Media
  facebook: "",
  instagram: "",
  twitter: "",

  // Branding
  primaryColor: "#06054e",
  secondaryColor: "#FFD700",
  accentColor: "#ffd700",
  useAccentColor: false,

  // Fees & Positions
  fees: [],
  positions: [],

  // Settings
  requiresApproval: false,
  autoApproveReturningPlayers: true,
  allowMultipleClubs: true,
  seasonStartMonth: 1,
  seasonEndMonth: 12,
  requiresInsurance: true,
  requiresMedicalInfo: true,
  requiresEmergencyContact: true,
};
