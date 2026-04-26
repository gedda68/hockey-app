/**
 * lib/db/schemas/umpireAssignment.schema.ts
 *
 * Zod schema for documents stored in the `umpire_assignments` MongoDB collection.
 *
 * Each document represents a single official assigned to a single fixture slot.
 * It is the source of truth for the assignment lifecycle:
 *   assigned → accepted | declined
 *
 * The fixture document's `umpires[slotIndex].allocationStatus` is kept in sync
 * when the umpire responds (via token or admin override), so existing query paths
 * that read from `league_fixtures` continue to work.
 */

import { z } from "zod";

export const UmpireAssignmentStatusSchema = z.enum([
  "assigned",
  "accepted",
  "declined",
]);

export type UmpireAssignmentStatus = z.infer<typeof UmpireAssignmentStatusSchema>;

/** Persisted document shape (`umpire_assignments` collection). */
export const UmpireAssignmentDocSchema = z.object({
  /** e.g. "ua-<uuid>" */
  assignmentId: z.string().min(1),

  // ── Fixture reference ──────────────────────────────────────────────────────
  fixtureId: z.string().min(1),
  seasonCompetitionId: z.string().min(1),
  associationId: z.string().min(1),

  /**
   * Index of this umpire in the fixture's `umpires[]` array.
   * -1 means the slot was appended (admin didn't provide an explicit index).
   */
  slotIndex: z.number().int().min(-1),

  // ── Official identity ──────────────────────────────────────────────────────
  /** memberId or umpireNumber — as stored on the fixture slot. */
  umpireId: z.string().min(1),
  umpireType: z.string().min(1),
  qualificationTier: z.string().nullable().optional(),
  isStandby: z.boolean().optional().default(false),

  // ── Assignment lifecycle ───────────────────────────────────────────────────
  allocationStatus: UmpireAssignmentStatusSchema.default("assigned"),
  dateNotified: z.string().nullable().optional(),
  dateAccepted: z.string().nullable().optional(),
  dateDeclined: z.string().nullable().optional(),

  // ── Token (for email accept/decline) ──────────────────────────────────────
  /** 64-char hex — embedded in accept/decline email links. */
  responseToken: z.string().length(64),
  tokenExpiresAt: z.string(),

  // ── COI override (when admin bypasses a blocking issue) ───────────────────
  coiOverride: z.boolean().optional(),
  coiOverrideReason: z.string().min(15).nullable().optional(),

  // ── Audit ──────────────────────────────────────────────────────────────────
  assignedBy: z.string().min(1),
  assignedByName: z.string().nullable().optional(),

  // ── Fixture snapshot (for display in email / history) ─────────────────────
  round: z.number().nullable().optional(),
  scheduledStart: z.string().nullable().optional(),
  venueName: z.string().nullable().optional(),
  umpireDisplayName: z.string().nullable().optional(),

  createdAt: z.string(),
  updatedAt: z.string(),
});

export type UmpireAssignmentDoc = z.infer<typeof UmpireAssignmentDocSchema>;

// ── POST /api/admin/umpires/assign request body ────────────────────────────

export const PostUmpireAssignBodySchema = z
  .object({
    fixtureId: z.string().min(1),
    seasonCompetitionId: z.string().min(1),
    umpireId: z.string().min(1),
    umpireType: z.string().min(1),
    /**
     * If provided, update that slot in the fixture's `umpires[]`.
     * If omitted, a new slot is appended.
     */
    slotIndex: z.number().int().min(0).optional(),
    qualificationTier: z.string().min(1).nullable().optional(),
    isStandby: z.boolean().optional().default(false),
    coiOverride: z.boolean().optional(),
    coiOverrideReason: z.string().min(15).max(1000).optional(),
    /**
     * When true, skip the COI re-check entirely (use only with coiOverride).
     * Default false — check is always run unless this flag + coiOverride both set.
     */
    skipCoiCheck: z.boolean().optional().default(false),
  })
  .refine(
    (d) => !d.coiOverride || (d.coiOverrideReason !== undefined && d.coiOverrideReason !== null),
    {
      message: "coiOverrideReason is required when coiOverride is true",
      path: ["coiOverrideReason"],
    },
  );

export type PostUmpireAssignBody = z.infer<typeof PostUmpireAssignBodySchema>;
