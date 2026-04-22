// types/club.types.ts
// Central type definitions for Club forms and components

import type { FeeScheduleEntry } from "@/types/feeSchedule";

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
  /** Public site opt-in flags (default false) */
  showEmailOnPublicSite?: boolean;
  showPhoneOnPublicSite?: boolean;
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
  /** Admin shell top bar — image replaces gradient when set */
  adminHeaderBannerUrl: string;
  /** Public portal top bar — image replaces tenant gradient when set */
  publicHeaderBannerUrl: string;

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

  /** Public footer / portal partners (B5) — same shape as association `branding.partners` */
  publicPartners: { name: string; url: string; logoUrl: string }[];

  /**
   * Per-role registration fee schedule (P1).
   * Each entry maps a (role, seasonYear) pair to an amount in cents AUD.
   * Consulted by POST /api/role-requests at submission time.
   */
  feeSchedule: FeeScheduleEntry[];

  // Status
  active: boolean;
}

export type SectionId =
  | "identity"
  | "details"
  | "contact"
  | "address"
  | "colors"
  | "committee"
  | "registration";

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

/** Optional props for `ColorsSection` (admin + public header banners). */
export type ColorsSectionBrandingProps = {
  clubIdForUpload?: string;
  isEditMode?: boolean;
  adminHeaderUploading?: boolean;
  onAdminHeaderBannerFile?: (file: File) => void;
  publicHeaderUploading?: boolean;
  onPublicHeaderBannerFile?: (file: File) => void;
};

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
  adminHeaderBannerUrl: "",
  publicHeaderBannerUrl: "",

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
  publicPartners: [],
  feeSchedule: [],
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
