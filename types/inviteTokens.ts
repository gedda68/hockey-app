/**
 * types/inviteTokens.ts
 *
 * Type definitions for the club member invitation / self-registration system.
 *
 * Flow:
 *   Registrar generates token → invite email sent (optional)
 *     ↓
 *   New member opens /clubs/[slug]/register?token=<hex>
 *     ↓
 *   Wizard: personal info → contact → playing category → review
 *     ↓
 *   POST /api/clubs/[clubId]/register → member created + role request submitted
 *     ↓
 *   Confirmation email sent; status: pending_payment | awaiting_approval
 */

import type { UserRole } from "@/lib/types/roles";

// ── Stored document ───────────────────────────────────────────────────────────

export type InviteTokenStatus = "active" | "expired" | "revoked";

export interface InviteToken {
  /** Primary key — "invite-<uuid>" */
  tokenId: string;
  /** 64-char random hex string embedded in the invite URL */
  token: string;

  /** Canonical club ID (e.g. "chc") */
  clubId: string;
  /** URL slug (e.g. "commercial-hockey-club") */
  clubSlug: string;
  /** Display name shown in the wizard header and emails */
  clubName: string;

  /** Season this invite is valid for, e.g. "2026" */
  seasonYear: string;
  /**
   * Roles that the invite pre-selects in Step 3.
   * Empty array = registrant chooses freely from all requestable roles.
   */
  roles: UserRole[];

  /** userId of the registrar who generated this token */
  createdBy: string;
  createdByName: string;
  createdAt: string;   // ISO
  expiresAt: string;   // ISO — default: 30 days from creation

  /** null/undefined = unlimited uses */
  maxUses?: number;
  /** Incremented atomically on each successful registration */
  useCount: number;

  status: InviteTokenStatus;
}

// ── Request bodies ────────────────────────────────────────────────────────────

/** Body for POST /api/admin/clubs/[clubId]/invites */
export interface GenerateInviteBody {
  seasonYear: string;
  /** Roles to pre-select; omit for open-choice wizard */
  roles?: UserRole[];
  /** Days until the link expires (default: 30) */
  expiresInDays?: number;
  /** Max number of registrations this link may be used for (default: unlimited) */
  maxUses?: number;
  /** If provided, send an invite email immediately to this address */
  recipientEmail?: string;
}

/** Body for POST /api/clubs/[clubId]/register */
export interface SelfRegistrationBody {
  /** The raw token from the URL query string */
  token: string;
  personalInfo: {
    salutation?: string;
    firstName:   string;
    lastName:    string;
    dateOfBirth: string;
    gender:      string;
  };
  contact: {
    email:   string;
    phone?:  string;
    mobile?: string;
    emergencyContact: {
      name:          string;
      relationship:  string;
      phone:         string;
      email?:        string;
    };
  };
  address?: {
    street?:   string;
    suburb?:   string;
    state?:    string;
    postcode?: string;
    country?:  string;
  };
  /** Role the registrant chose (or was pre-filled from the token) */
  selectedRole: UserRole;
}

// ── API response shapes ───────────────────────────────────────────────────────

/** Shape of a resolved fee option returned by the token-validation endpoint */
export interface ResolvedRoleOption {
  role:         UserRole;
  label:        string;
  requiresFee:  boolean;
  feeAmountCents?: number;
  feeDescription?: string;
  gstIncluded?:    boolean;
}

/** Response from GET /api/clubs/[clubId]/invites/[token] */
export interface TokenValidationResponse {
  valid: true;
  tokenId:    string;
  clubId:     string;
  clubName:   string;
  clubSlug:   string;
  seasonYear: string;
  /** Pre-resolved role options with fee data — drives the Step 3 selector */
  roleOptions: ResolvedRoleOption[];
}

/** Response from POST /api/clubs/[clubId]/register */
export interface RegistrationResult {
  memberId:       string;
  requestId:      string | null;
  status:         "pending_payment" | "awaiting_approval" | "no_role_request";
  requiresFee:    boolean;
  feeAmountCents?: number;
  feeDescription?: string;
  clubName:       string;
  seasonYear:     string;
}
