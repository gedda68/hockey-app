// lib/db/schemas/association.schema.ts
// Association database schema with full contact and hierarchy support

import { z } from "zod";

// ============================================================================
// ASSOCIATION POSITION SCHEMA
// ============================================================================

export const AssociationPositionSchema = z.object({
  positionId: z.string(),
  title: z.string(),
  displayName: z.string(),
  description: z.string().optional(),
  contactPerson: z
    .object({
      name: z.string(),
      email: z.string().email(),
      phone: z.string(),
      mobile: z.string().optional(),
    })
    .optional(),
  displayOrder: z.number().default(0),
  isActive: z.boolean().default(true),
});

export type AssociationPosition = z.infer<typeof AssociationPositionSchema>;

// ============================================================================
// ASSOCIATION FEE SCHEMA
// ============================================================================

export const AssociationFeeSchema = z.object({
  feeId: z.string(),
  name: z.string(), // e.g., "Junior Registration"
  category: z.string(), // e.g., "Junior", "Senior", "Masters"
  amount: z.number(),
  gstIncluded: z.boolean().default(true),
  description: z.string().optional(),
  validFrom: z.date(),
  validTo: z.date().optional(),
  isActive: z.boolean().default(true),

  // Fee applicability
  appliesTo: z
    .object({
      ageCategories: z.array(z.string()).optional(), // ["junior", "senior"]
      roleCategories: z.array(z.string()).optional(), // ["Participant", "Playing"]
      minAge: z.number().optional(),
      maxAge: z.number().optional(),
    })
    .optional(),
});

export type AssociationFee = z.infer<typeof AssociationFeeSchema>;

// ============================================================================
// SOCIAL MEDIA SCHEMA
// ============================================================================

export const SocialMediaSchema = z.object({
  facebook: z.string().url().optional(),
  instagram: z.string().url().optional(),
  twitter: z.string().url().optional(),
  youtube: z.string().url().optional(),
  linkedin: z.string().url().optional(),
  tiktok: z.string().url().optional(),
});

export type SocialMedia = z.infer<typeof SocialMediaSchema>;

// ============================================================================
// ASSOCIATION SCHEMA
// ============================================================================

export const AssociationSchema = z.object({
  // Identity
  associationId: z.string(),
  code: z.string(), // e.g., "BHA", "HQ", "HA"
  name: z.string(),
  fullName: z.string(),
  acronym: z.string().optional(),

  // Hierarchy
  parentAssociationId: z.string().optional(), // Links to parent association
  level: z.number(), // 0 = National, 1 = State, 2 = Regional
  hierarchy: z.array(z.string()), // ["HA", "HQ", "BHA"] for path

  // Location
  region: z.string(),
  state: z.string(),
  country: z.string(),
  timezone: z.string().default("Australia/Brisbane"),

  // Address
  address: z.object({
    street: z.string(),
    suburb: z.string(),
    city: z.string(),
    state: z.string(),
    postcode: z.string(),
    country: z.string(),
  }),

  // Mailing address (if different)
  mailingAddress: z
    .object({
      street: z.string(),
      suburb: z.string(),
      city: z.string(),
      state: z.string(),
      postcode: z.string(),
      country: z.string(),
    })
    .optional(),

  // Primary Contact
  contact: z.object({
    primaryEmail: z.string().email(),
    secondaryEmail: z.string().email().optional(),
    phone: z.string(),
    mobile: z.string().optional(),
    fax: z.string().optional(),
    website: z.string().url().optional(),
  }),

  // Social Media
  socialMedia: SocialMediaSchema.optional(),

  // Key Positions (configurable)
  positions: z.array(AssociationPositionSchema).default([]),

  // Registration Fees (configurable)
  fees: z.array(AssociationFeeSchema).default([]),

  // Settings
  settings: z.object({
    requiresApproval: z.boolean().default(false),
    autoApproveReturningPlayers: z.boolean().default(true),
    allowMultipleClubs: z.boolean().default(true),
    seasonStartMonth: z.number().min(1).max(12),
    seasonEndMonth: z.number().min(1).max(12),
    registrationOpenDate: z.date().optional(),
    registrationCloseDate: z.date().optional(),
    requiresClearance: z.boolean().default(false),
    requiresInsurance: z.boolean().default(true),
    requiresMedicalInfo: z.boolean().default(true),
    requiresEmergencyContact: z.boolean().default(true),
  }),

  // Branding
  branding: z
    .object({
      logoUrl: z.string().url().optional(),
      primaryColor: z.string().optional(),
      secondaryColor: z.string().optional(),
      bannerUrl: z.string().url().optional(),
    })
    .optional(),

  // Status
  status: z.enum(["active", "inactive", "suspended"]).default("active"),

  // Metadata
  metadata: z
    .object({
      foundedYear: z.number().optional(),
      affiliationNumber: z.string().optional(),
      abn: z.string().optional(),
      acn: z.string().optional(),
      registeredCharity: z.boolean().default(false),
      charityNumber: z.string().optional(),
    })
    .optional(),

  // Audit
  createdAt: z.date(),
  updatedAt: z.date(),
  createdBy: z.string().optional(),
  updatedBy: z.string().optional(),
});

export type Association = z.infer<typeof AssociationSchema>;

// ============================================================================
// ASSOCIATION HIERARCHY HELPER
// ============================================================================

export interface AssociationHierarchy {
  association: Association;
  parent?: Association;
  children: Association[];
  allAncestors: Association[]; // Bottom to top: [BHA, HQ, HA]
}

// ============================================================================
// DEFAULT POSITIONS
// ============================================================================

export const DEFAULT_ASSOCIATION_POSITIONS: AssociationPosition[] = [
  {
    positionId: "pos-president",
    title: "President",
    displayName: "President",
    displayOrder: 1,
    isActive: true,
  },
  {
    positionId: "pos-vice-president",
    title: "Vice President",
    displayName: "Vice President",
    displayOrder: 2,
    isActive: true,
  },
  {
    positionId: "pos-secretary",
    title: "Secretary",
    displayName: "Secretary",
    displayOrder: 3,
    isActive: true,
  },
  {
    positionId: "pos-treasurer",
    title: "Treasurer",
    displayName: "Treasurer",
    displayOrder: 4,
    isActive: true,
  },
  {
    positionId: "pos-registrar",
    title: "Registrar",
    displayName: "Registrar",
    displayOrder: 5,
    isActive: true,
  },
  {
    positionId: "pos-competitions",
    title: "Competitions Manager",
    displayName: "Competitions Manager",
    displayOrder: 6,
    isActive: true,
  },
];

// ============================================================================
// SAMPLE ASSOCIATIONS (SEED DATA)
// ============================================================================

export const SAMPLE_ASSOCIATIONS = {
  HA: {
    associationId: "ha",
    code: "HA",
    name: "Hockey Australia",
    fullName: "Hockey Australia Limited",
    level: 0,
    hierarchy: ["ha"],
    region: "National",
    state: "National",
    country: "Australia",
  },

  HQ: {
    associationId: "hq",
    code: "HQ",
    name: "Hockey Queensland",
    fullName: "Hockey Queensland Inc.",
    parentAssociationId: "ha",
    level: 1,
    hierarchy: ["ha", "hq"],
    region: "Queensland",
    state: "QLD",
    country: "Australia",
  },

  BHA: {
    associationId: "bha",
    code: "BHA",
    name: "Brisbane Hockey Association",
    fullName: "Brisbane Hockey Association Inc.",
    parentAssociationId: "hq",
    level: 2,
    hierarchy: ["ha", "hq", "bha"],
    region: "Brisbane",
    state: "QLD",
    country: "Australia",
  },

  GCHA: {
    associationId: "gcha",
    code: "GCHA",
    name: "Gold Coast Hockey Association",
    fullName: "Gold Coast Hockey Association Inc.",
    parentAssociationId: "hq",
    level: 2,
    hierarchy: ["ha", "hq", "gcha"],
    region: "Gold Coast",
    state: "QLD",
    country: "Australia",
  },
};
