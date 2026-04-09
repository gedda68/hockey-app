// lib/db/schemas/umpireMatchPayment.schema.ts
// Tiered match payments for umpires: qualification tier × match level (F4).

import { z } from "zod";

/** One cell in the rate matrix (amounts in minor units, e.g. cents). */
export const UmpirePaymentRateCellSchema = z.object({
  qualificationTier: z.string().min(1),
  matchLevel: z.string().min(1),
  amountCents: z.number().int().min(0),
  currency: z.string().min(3).max(3).default("AUD"),
});

export type UmpirePaymentRateCell = z.infer<typeof UmpirePaymentRateCellSchema>;

/** Stored on Mongo `association_umpire_payment_schedules` (one doc per association). */
export const AssociationUmpirePaymentScheduleSchema = z.object({
  associationId: z.string().min(1),
  defaultCurrency: z.string().length(3).default("AUD"),
  /** Matrix rows: each (qualificationTier, matchLevel) pair should be unique per schedule. */
  rates: z.array(UmpirePaymentRateCellSchema).default([]),
  /** Optional display names, keyed by tier / level code. */
  qualificationLabels: z.record(z.string(), z.string()).optional(),
  matchLevelLabels: z.record(z.string(), z.string()).optional(),
  updatedAt: z.string().optional(),
  updatedBy: z.string().optional(),
});

export type AssociationUmpirePaymentSchedule = z.infer<
  typeof AssociationUmpirePaymentScheduleSchema
>;

export const PutUmpirePaymentScheduleBodySchema = z.object({
  defaultCurrency: z.string().length(3).default("AUD"),
  rates: z.array(UmpirePaymentRateCellSchema),
  qualificationLabels: z.record(z.string(), z.string()).optional(),
  matchLevelLabels: z.record(z.string(), z.string()).optional(),
});

export type PutUmpirePaymentScheduleBody = z.infer<
  typeof PutUmpirePaymentScheduleBodySchema
>;

// ── Persisted payment lines (ledger) ─────────────────────────────────────────

export const UmpirePaymentLineStatusSchema = z.enum([
  "pending",
  "approved",
  "paid",
]);

export type UmpirePaymentLineStatus = z.infer<
  typeof UmpirePaymentLineStatusSchema
>;

/** Mongo `umpire_match_payment_lines`. */
export const UmpirePaymentLineDocSchema = z.object({
  paymentLineId: z.string().min(1),
  associationId: z.string().min(1),
  seasonCompetitionId: z.string().min(1),
  fixtureId: z.string().min(1),
  umpireId: z.string().min(1),
  umpireType: z.string().min(1),
  qualificationTier: z.string().min(1),
  matchLevel: z.string().min(1),
  amountCents: z.union([z.number().int().min(0), z.null()]),
  currency: z.string().length(3),
  status: UmpirePaymentLineStatusSchema,
  createdAt: z.string(),
  createdBy: z.string(),
  approvedAt: z.string().nullable().optional(),
  approvedBy: z.string().nullable().optional(),
  paidAt: z.string().nullable().optional(),
  paidBy: z.string().nullable().optional(),
});

export type UmpirePaymentLineDoc = z.infer<typeof UmpirePaymentLineDocSchema>;

export const PostUmpirePaymentLinesBodySchema = z.object({
  defaultQualificationTier: z.string().min(1).optional(),
  /** When true, create rows even if no rate matched (amountCents null). */
  includeUnpriced: z.boolean().optional().default(false),
});

export type PostUmpirePaymentLinesBody = z.infer<
  typeof PostUmpirePaymentLinesBodySchema
>;

export const PatchUmpirePaymentLinesBodySchema = z.object({
  items: z
    .array(
      z.object({
        paymentLineId: z.string().min(1),
        status: z.enum(["approved", "paid"]),
      }),
    )
    .min(1),
});

export type PatchUmpirePaymentLinesBody = z.infer<
  typeof PatchUmpirePaymentLinesBodySchema
>;
