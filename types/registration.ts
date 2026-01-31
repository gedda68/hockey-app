// types/registration.ts
// Complete registration workflow types

import { z } from "zod";

// ============================================================================
// REGISTRATION FEE LINE ITEM
// ============================================================================

export const FeeLineItemSchema = z.object({
  itemId: z.string(),
  feeId: z.string(),
  type: z.enum(["association", "club", "insurance", "levy", "other"]),
  name: z.string(),
  description: z.string().optional(),
  amount: z.number(),
  gstIncluded: z.boolean().default(true),
  gstAmount: z.number().optional(),
  associationId: z.string().optional(),
  clubId: z.string().optional(),
});

export type FeeLineItem = z.infer<typeof FeeLineItemSchema>;

// ============================================================================
// REGISTRATION PAYLOAD
// ============================================================================

export const RegistrationPayloadSchema = z.object({
  // Member info (can be new or existing)
  memberId: z.string().optional(), // If existing member
  isNewMember: z.boolean().default(false),

  // Personal details (for new members)
  personalInfo: z
    .object({
      firstName: z.string(),
      lastName: z.string(),
      dateOfBirth: z.string(),
      gender: z.enum(["male", "female", "other", "prefer_not_to_say"]),
      email: z.string().email(),
      phone: z.string(),
    })
    .optional(),

  // Address (for new members)
  address: z
    .object({
      street: z.string(),
      suburb: z.string(),
      city: z.string(),
      state: z.string(),
      postcode: z.string(),
      country: z.string().default("Australia"),
    })
    .optional(),

  // Emergency contact
  emergencyContact: z
    .object({
      name: z.string(),
      relationship: z.string(),
      phone: z.string(),
      alternatePhone: z.string().optional(),
    })
    .optional(),

  // Medical info
  medicalInfo: z
    .object({
      conditions: z.string().optional(),
      medications: z.string().optional(),
      allergies: z.string().optional(),
      doctorName: z.string().optional(),
      doctorPhone: z.string().optional(),
      healthFundProvider: z.string().optional(),
      healthFundNumber: z.string().optional(),
    })
    .optional(),

  // Registration details
  clubId: z.string(),
  seasonYear: z.string(),

  // Roles (can be multiple)
  roleIds: z.array(z.string()).min(1),

  // Categories
  ageCategory: z.enum(["junior", "senior", "masters"]),
  playerClassification: z.string().optional(),

  // Fees selected
  associationFees: z.array(z.string()), // Association fee IDs
  clubFees: z.array(z.string()), // Club fee IDs

  // Additional options
  requiresInsurance: z.boolean().default(true),
  wantsVolunteer: z.boolean().default(false),
  shirtSize: z.string().optional(),

  // Agreements
  agreedToTerms: z.boolean(),
  agreedToCodeOfConduct: z.boolean(),
  agreedToPrivacyPolicy: z.boolean(),
  photoConsent: z.boolean().default(false),

  // Notes
  notes: z.string().optional(),
});

export type RegistrationPayload = z.infer<typeof RegistrationPayloadSchema>;

// ============================================================================
// REGISTRATION SUMMARY
// ============================================================================

export interface RegistrationSummary {
  // Member details
  member: {
    memberId?: string;
    isNew: boolean;
    firstName: string;
    lastName: string;
    email: string;
    dateOfBirth: string;
  };

  // Registration hierarchy
  registrations: {
    association: {
      associationId: string;
      name: string;
      fees: FeeLineItem[];
    };
    parentAssociations: Array<{
      associationId: string;
      name: string;
      fees: FeeLineItem[];
    }>;
    club: {
      clubId: string;
      name: string;
      fees: FeeLineItem[];
    };
  };

  // Roles
  roles: Array<{
    roleId: string;
    name: string;
    category: string;
  }>;

  // Financial summary
  fees: {
    lineItems: FeeLineItem[];
    subtotal: number;
    gst: number;
    total: number;
  };

  // Status
  requiresApproval: boolean;
  autoApproved: boolean;

  // Season
  seasonYear: string;
}

// ============================================================================
// COMPLETED REGISTRATION
// ============================================================================

export interface CompletedRegistration {
  registrationId: string;
  memberId: string;

  // Created registrations
  associationRegistrations: Array<{
    registrationId: string;
    associationId: string;
    associationName: string;
    status: string;
  }>;

  clubRegistration: {
    registrationId: string;
    clubId: string;
    clubName: string;
    status: string;
  };

  // Payment
  payment: {
    paymentId: string;
    amount: number;
    status: string;
    method?: string;
  };

  // Next steps
  nextSteps: string[];
}

// ============================================================================
// RETURNING PLAYER DETECTION
// ============================================================================

export interface ReturningPlayerInfo {
  isReturningPlayer: boolean;
  previousRegistrations: Array<{
    seasonYear: string;
    clubId: string;
    clubName: string;
    associationId: string;
    roles: string[];
  }>;

  // Auto-fill data
  suggestedData: {
    personalInfo?: any;
    address?: any;
    emergencyContact?: any;
    medicalInfo?: any;
    preferences?: {
      shirtSize?: string;
      photoConsent?: boolean;
    };
  };
}

// ============================================================================
// VALIDATION RESULTS
// ============================================================================

export interface RegistrationValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];

  // Eligibility
  eligibility: {
    canRegister: boolean;
    isBanned: boolean;
    banDetails?: {
      reason: string;
      bannedUntil: Date;
      bannedBy: string;
    };
    hasOutstandingFees: boolean;
    outstandingAmount?: number;
  };

  // Fee validation
  feeValidation: {
    totalFees: number;
    missingFees: string[];
    invalidFees: string[];
  };
}
