// types/association-registration.ts
// Association registration types and interfaces

import { z } from "zod";

// ============================================================================
// ENUMS
// ============================================================================

export const AssociationStatus = z.enum([
  "pending", // Registration submitted, awaiting approval
  "approved", // Approved by association
  "active", // Active member of association
  "suspended", // Temporarily suspended
  "expired", // Registration expired
  "rejected", // Registration rejected
  "cancelled", // Cancelled
]);

export type AssociationStatus = z.infer<typeof AssociationStatus>;

// ============================================================================
// ASSOCIATION REGISTRATION INTERFACE
// ============================================================================

export interface AssociationRegistration {
  registrationId: string; // Unique registration ID
  memberId: string; // Member ID
  associationId: string; // Association ID (e.g., "bha")

  status: AssociationStatus; // Current status

  // Registration details
  registeredDate: Date; // When registered
  approvedDate?: Date; // When approved
  approvedBy?: string; // Admin who approved
  expiryDate?: Date; // Registration expiry (typically end of season)
  seasonYear: string; // e.g., "2024", "2025"

  // Player classification (for competition rules)
  playerClassification?: string; // e.g., "Junior", "Senior", "Masters"

  // Payment
  registrationFee?: number;
  paymentStatus?: "unpaid" | "paid" | "waived";
  paymentDate?: Date;
  transactionId?: string;

  // Clearances and permits
  hasClearance?: boolean; // If transferred from another association
  clearanceFrom?: string; // Previous association
  permitNumber?: string; // Association permit number

  // Insurance
  insuranceProvider?: string;
  insurancePolicyNumber?: string;
  insuranceExpiryDate?: Date;

  // Notes
  registrationNotes?: string;
  rejectionReason?: string;

  // Audit
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// ASSOCIATION INTERFACE
// ============================================================================

export interface Association {
  id: string; // e.g., "bha"
  code: string; // Short code e.g., "BHA"
  name: string; // e.g., "Brisbane Hockey Association"
  fullName: string; // e.g., "Brisbane Hockey Association Inc."

  region: string; // e.g., "Brisbane", "Gold Coast"
  state: string; // e.g., "QLD"
  country: string; // e.g., "Australia"

  // Contact
  email: string;
  phone: string;
  website?: string;

  // Address
  address?: {
    street: string;
    suburb: string;
    state: string;
    postcode: string;
  };

  // Registration settings
  settings: {
    requiresApproval: boolean; // Does association approve registrations?
    registrationFee: number; // Default fee
    seasonStartMonth: number; // e.g., 1 = January
    seasonEndMonth: number; // e.g., 12 = December
    requiresClearance: boolean; // For transfers
    requiresInsurance: boolean;
  };

  // Status
  active: boolean;

  // Audit
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// MEMBER ELIGIBILITY
// ============================================================================

export interface MemberEligibility {
  isEligible: boolean;

  // Requirements
  hasAssociationRegistration: boolean;
  associationStatus?: AssociationStatus;
  associationExpiryDate?: Date;

  hasClubRegistration: boolean;
  clubStatus?: string;

  // Blockers
  blockers: string[]; // Reasons why not eligible
  warnings: string[]; // Warnings (eligible but with caveats)

  // Details
  associationRegistration?: {
    registrationId: string;
    associationId: string;
    associationName: string;
    status: AssociationStatus;
    seasonYear: string;
  };

  clubRegistration?: {
    registrationId: string;
    clubId: string;
    clubName: string;
    status: string;
    registrationType: "primary" | "secondary";
  };
}

// ============================================================================
// REGISTRATION WORKFLOW STATE
// ============================================================================

export interface RegistrationWorkflowState {
  // Step completion
  associationRegistrationComplete: boolean;
  clubRegistrationComplete: boolean;

  // Current step
  currentStep: "association" | "club" | "complete";

  // Next action
  nextAction?: {
    type:
      | "register-association"
      | "register-club"
      | "await-approval"
      | "complete";
    description: string;
    actionUrl?: string;
  };

  // Status summary
  associationStatus?: AssociationStatus;
  clubStatus?: string;

  // Eligibility
  canJoinTeams: boolean;
  eligibilityMessage?: string;
}

// ============================================================================
// REGISTRATION REQUEST SCHEMAS
// ============================================================================

export const RegisterForAssociationRequestSchema = z.object({
  memberId: z.string(),
  associationId: z.string(),
  seasonYear: z.string().regex(/^\d{4}$/, "Invalid season year"),
  playerClassification: z.string().optional(),
  registrationNotes: z.string().optional(),

  // Payment
  paymentMethod: z.enum(["card", "bank_transfer", "cash", "waived"]).optional(),

  // Clearance (if from another association)
  requiresClearance: z.boolean().optional(),
  clearanceFrom: z.string().optional(),
});

export type RegisterForAssociationRequest = z.infer<
  typeof RegisterForAssociationRequestSchema
>;

export const ApproveAssociationRegistrationSchema = z.object({
  registrationId: z.string(),
  permitNumber: z.string().optional(),
  registrationFee: z.number().optional(),
  expiryDate: z.string().optional(),
  notes: z.string().optional(),
});

export type ApproveAssociationRegistration = z.infer<
  typeof ApproveAssociationRegistrationSchema
>;

// ============================================================================
// VALIDATION RESULTS
// ============================================================================

export interface AssociationRegistrationValidation {
  canRegister: boolean;
  errors: string[];
  warnings: string[];

  hasExistingRegistration: boolean;
  existingRegistration?: {
    registrationId: string;
    status: AssociationStatus;
    seasonYear: string;
    expiryDate?: Date;
  };
}
