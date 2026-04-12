// types/club.types.ts
// Central type definitions for Club forms and components

export interface Association {
  associationId: string;
  code: string;
  name: string;
  level: number;
}

export interface CommitteeMember {
  id: string;
  name: string;
  position: string;
  email: string;
  phone: string;
}

export interface ClubFormData {
  // Identity
  id: string;
  name: string;
  shortName: string;
  slug: string;
  /** Optional portal host label ({portalSlug}.your-domain); falls back to slug */
  portalSlug: string;
  parentAssociationId: string;

  // Details
  logo: string;
  established: string;
  homeGround: string;
  description: string;
  about: string;

  // Colors
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;

  // Address
  street: string;
  suburb: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
  region: string;

  // Contact
  email: string;
  phone: string;
  website: string;

  // Social Media
  facebook: string;
  instagram: string;
  twitter: string;

  // Committee
  committee: CommitteeMember[];
  committeePositions: string[];

  // Status
  active: boolean;
}

export type SectionId =
  | "identity"
  | "details"
  | "contact"
  | "address"
  | "colors"
  | "committee";

export interface SectionDefinition {
  id: SectionId;
  label: string;
  icon: any;
  desc: string;
}

export interface BaseSectionProps {
  formData: ClubFormData;
  onChange: (field: string, value: any) => void;
  errors: Record<string, string>;
}

export interface IdentitySectionProps extends BaseSectionProps {
  associations: Association[];
  isEdit: boolean;
}

export const DEFAULT_CLUB_DATA: ClubFormData = {
  // Identity
  id: "",
  name: "",
  shortName: "",
  slug: "",
  portalSlug: "",
  parentAssociationId: "",

  // Details
  logo: "",
  established: "",
  homeGround: "",
  description: "",
  about: "",

  // Colors
  primaryColor: "#06054e",
  secondaryColor: "#FFD700",
  accentColor: "#ffffff",

  // Address
  street: "",
  suburb: "",
  city: "",
  state: "QLD",
  postcode: "",
  country: "Australia",
  region: "",

  // Contact
  email: "",
  phone: "",
  website: "",

  // Social Media
  facebook: "",
  instagram: "",
  twitter: "",

  // Committee
  committee: [],
  committeePositions: [
    "President",
    "Vice President",
    "Secretary",
    "Treasurer",
    "Committee Member",
  ],

  // Status
  active: true,
};
