// types/club-registration.ts
// Club registration types and interfaces

import { z } from "zod";

// ============================================================================
// ENUMS
// ============================================================================

export const RegistrationStatus = z.enum([
  "pending", // Registration submitted, awaiting approval
  "approved", // Registration approved by club admin
  "rejected", // Registration rejected
  "active", // Active member
  "suspended", // Temporarily suspended
  "expired", // Registration expired
  "cancelled", // Cancelled by member or club
]);

export const RegistrationType = z.enum([
  "primary", // Primary club registration
  "secondary", // Secondary club registration
]);

export type RegistrationStatus = z.infer<typeof RegistrationStatus>;
export type RegistrationType = z.infer<typeof RegistrationType>;

// ============================================================================
// CLUB REGISTRATION INTERFACE
// ============================================================================

export interface ClubRegistration {
  registrationId: string; // Unique registration ID
  memberId: string; // Member ID
  clubId: string; // Club ID
  registrationType: RegistrationType; // primary or secondary
  status: RegistrationStatus; // Current status

  // Registration details
  registeredDate: Date; // When registered
  approvedDate?: Date; // When approved
  approvedBy?: string; // Admin who approved
  expiryDate?: Date; // Registration expiry

  // Membership type at this club
  membershipType?: string; // Playing, Social, etc.
  roleIds: string[]; // Roles at this club

  // Payment
  registrationFee?: number;
  paymentStatus?: "unpaid" | "paid" | "waived";
  paymentDate?: Date;

  // Notes
  registrationNotes?: string; // Admin notes
  rejectionReason?: string; // If rejected

  // Audit
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// MEMBER WITH CLUB REGISTRATIONS
// ============================================================================

export interface MemberClubRegistrations {
  primaryClub?: {
    clubId: string;
    clubName: string;
    registrationId: string;
    status: RegistrationStatus;
    registeredDate: Date;
    roleIds: string[];
  };

  secondaryClubs: Array<{
    clubId: string;
    clubName: string;
    registrationId: string;
    status: RegistrationStatus;
    registeredDate: Date;
    roleIds: string[];
  }>;
}

// ============================================================================
// REGISTRATION REQUEST
// ============================================================================

export const RegisterForClubRequestSchema = z.object({
  clubId: z.string(),
  registrationType: RegistrationType,
  membershipType: z.string().optional(),
  roleIds: z.array(z.string()).min(1, "At least one role required"),
  registrationNotes: z.string().optional(),
});

export type RegisterForClubRequest = z.infer<
  typeof RegisterForClubRequestSchema
>;

// ============================================================================
// APPROVAL REQUEST
// ============================================================================

export const ApproveRegistrationRequestSchema = z.object({
  registrationId: z.string(),
  membershipType: z.string().optional(),
  registrationFee: z.number().optional(),
  expiryDate: z.string().optional(), // ISO date string
  notes: z.string().optional(),
});

export type ApproveRegistrationRequest = z.infer<
  typeof ApproveRegistrationRequestSchema
>;

// ============================================================================
// REJECTION REQUEST
// ============================================================================

export const RejectRegistrationRequestSchema = z.object({
  registrationId: z.string(),
  rejectionReason: z.string().min(1, "Rejection reason required"),
});

export type RejectRegistrationRequest = z.infer<
  typeof RejectRegistrationRequestSchema
>;

// ============================================================================
// VALIDATION RESULTS
// ============================================================================

export interface RegistrationValidation {
  canRegister: boolean;
  errors: string[];
  warnings: string[];

  // Context
  hasPrimaryClub: boolean;
  primaryClubId?: string;
  secondaryClubCount: number;
  existingRegistration?: {
    clubId: string;
    status: RegistrationStatus;
    registrationType: RegistrationType;
  };
}

// ============================================================================
// REGISTRATION STATISTICS
// ============================================================================

export interface RegistrationStatistics {
  total: number;
  pending: number;
  approved: number;
  active: number;
  rejected: number;
  expired: number;

  byType: {
    primary: number;
    secondary: number;
  };
}
