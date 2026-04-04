/**
 * types/roleRequests.ts
 *
 * Type definitions for the role-request approval workflow.
 *
 * Flow:
 *
 *   Member/user submits request
 *         │
 *         ▼
 *   ┌─────────────────────────────────────────────────────────────┐
 *   │  fee required?                                              │
 *   │   YES → "pending_payment"  ──(payment recorded)──►         │
 *   │    NO →                                                     │
 *   │                            "awaiting_approval"  ──►        │
 *   │                              admin reviews                  │
 *   │                              approved → "approved"          │
 *   │                              rejected → "rejected"          │
 *   │                              requester withdraws → "withdrawn" │
 *   └─────────────────────────────────────────────────────────────┘
 *
 * On approval:
 *   • A RoleAssignment is written to the member/user's roles[] array in MongoDB.
 *   • The request document is kept as a permanent audit record.
 *
 * Who can approve:
 *   • Club-scoped roles   → club-admin (or above) for that specific club
 *   • Assoc-scoped roles  → association-admin (or above) for that association
 *   • Global roles        → super-admin only
 */

import type { UserRole, ScopeType } from "@/lib/types/roles";

// ── Fee waiver audit record ───────────────────────────────────────────────────
// Stored permanently on the request document whenever a fee is waived.
// Required fields exist to satisfy governance / anti-nepotism scrutiny.

export interface FeeWaiver {
  /** userId of the person who granted the waiver */
  grantedBy: string;
  grantedByName: string;
  /** The role they held AT THE TIME of granting — stored explicitly so it
   *  remains accurate even if their role later changes */
  grantedByRole: string;
  /** Human-readable scope they held that role at, e.g. "Commercial Hockey Club" */
  grantedByScope: string;
  /** ISO datetime the waiver was granted */
  grantedAt: string;
  /** Mandatory plain-text reason — must be substantive, not blank */
  reason: string;
}

// ── Workflow states ───────────────────────────────────────────────────────────

export type RoleRequestStatus =
  | "pending_payment"    // Fee is required and has not been paid yet
  | "awaiting_approval"  // Fee paid (or no fee) — waiting for an admin to act
  | "approved"           // Admin approved — RoleAssignment has been created
  | "rejected"           // Admin rejected the request
  | "withdrawn";         // Requester cancelled before a decision was made

// ── Request document ──────────────────────────────────────────────────────────

export interface RoleRequest {
  /** Unique identifier — e.g. "rreq-<uuid>" */
  requestId: string;

  // ── Who is requesting ──────────────────────────────────────────────────────
  /** The member or user the role is being requested for */
  memberId: string;
  /** "member" = members collection; "user" = users collection */
  accountType: "member" | "user";
  /** Display name at time of request */
  memberName: string;

  // ── What role is being requested ──────────────────────────────────────────
  requestedRole: UserRole;
  scopeType: ScopeType;
  /** associationId or clubId — omit for global roles */
  scopeId?: string;
  /** Human-readable name of the org — stored for audit display */
  scopeName?: string;
  /** Season or year this registration applies to — e.g. "2025" */
  seasonYear?: string;
  /** Optional context e.g. "Under 16 Boys Head Coach", "Masters Women Division 1" */
  notes?: string;

  // ── Who submitted the request ──────────────────────────────────────────────
  /** userId of who submitted (may be the member themselves or an admin on their behalf) */
  requestedBy: string;
  requestedByName: string;
  requestedAt: string;  // ISO date string

  // ── Fee ───────────────────────────────────────────────────────────────────
  requiresFee: boolean;
  /** Amount in cents to avoid floating-point issues */
  feeAmountCents?: number;
  feeDescription?: string;  // e.g. "2025 Senior Player Registration — CHC"
  feePaid: boolean;
  paymentId?: string;       // References payments collection
  paymentDate?: string;     // ISO date string
  /** Populated only when the fee was waived rather than paid — full audit trail */
  feeWaiver?: FeeWaiver;

  // ── Workflow state ────────────────────────────────────────────────────────
  status: RoleRequestStatus;

  // ── Review ────────────────────────────────────────────────────────────────
  reviewedAt?: string;
  reviewedBy?: string;      // userId of the admin who acted
  reviewedByName?: string;
  reviewerRole?: string;    // Role the reviewer held when they approved/rejected
  reviewNotes?: string;     // Admin's reason (required for rejections)

  // ── Result ────────────────────────────────────────────────────────────────
  /** Set on approval — can be used to look up the live RoleAssignment */
  roleAssignmentCreatedAt?: string;

  // ── Timestamps ────────────────────────────────────────────────────────────
  createdAt: string;
  updatedAt: string;
}

// ── API payloads ──────────────────────────────────────────────────────────────

/** Body for POST /api/role-requests */
export interface SubmitRoleRequestBody {
  memberId: string;
  accountType: "member" | "user";
  requestedRole: UserRole;
  scopeType: ScopeType;
  scopeId?: string;
  seasonYear?: string;
  notes?: string;
}

/** Body for POST /api/admin/role-requests/[requestId]/approve */
export interface ApproveRoleRequestBody {
  reviewNotes?: string;
  /**
   * Set to true to waive the fee instead of requiring payment.
   * When true, waiverReason is MANDATORY — the endpoint will reject
   * the request without it.
   */
  waiveFee?: boolean;
  /**
   * Required when waiveFee is true.
   * Must be a substantive explanation — e.g. "Life member — board resolution
   * 2025-03-01", "Financial hardship — approved by committee", etc.
   */
  waiverReason?: string;
  /** If approving with a payment already recorded, pass the paymentId */
  paymentId?: string;
}

/** Body for POST /api/admin/role-requests/[requestId]/reject */
export interface RejectRoleRequestBody {
  /** Required — admin must give a reason */
  reviewNotes: string;
}

/** Body for POST /api/admin/role-requests/[requestId]/payment */
export interface RecordPaymentBody {
  paymentId: string;
  amountCents: number;
  paymentDate: string;
}

// ── Query / filter for listing requests ──────────────────────────────────────

export interface RoleRequestFilters {
  status?: RoleRequestStatus | RoleRequestStatus[];
  scopeId?: string;
  scopeType?: ScopeType;
  seasonYear?: string;
  requestedRole?: UserRole;
  memberId?: string;
}
