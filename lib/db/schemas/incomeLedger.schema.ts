import { z } from "zod";

export const IncomeLedgerSourceSchema = z.enum([
  "stripe",
  "manual_cash",
  "manual_bank_transfer",
  "manual_other",
  "simulated",
]);
export type IncomeLedgerSource = z.infer<typeof IncomeLedgerSourceSchema>;

export const IncomeLedgerStatusSchema = z.enum([
  "paid",
  "partially_refunded",
  "refunded",
  "cancelled",
]);
export type IncomeLedgerStatus = z.infer<typeof IncomeLedgerStatusSchema>;

export const IncomeLedgerReferenceTypeSchema = z.enum([
  "payment", // current payments collection record
  "order",
  "manual",
]);
export type IncomeLedgerReferenceType = z.infer<typeof IncomeLedgerReferenceTypeSchema>;

export const IncomeLedgerEntryDocSchema = z.object({
  entryId: z.string().min(1), // inc-...
  scopeType: z.enum(["association", "club"]),
  scopeId: z.string().min(1),

  // Core financial fields
  date: z.string().min(1), // ISO date-time of the income event
  amountCents: z.number().int(),
  gstIncluded: z.boolean().default(true),
  gstAmountCents: z.number().int().default(0),

  // Categorisation (F1)
  accountId: z.string().min(1).nullable().optional(),
  costCentreId: z.string().min(1).nullable().optional(),
  categoryName: z.string().min(1).max(160).optional(),

  description: z.string().min(1).max(400),

  source: IncomeLedgerSourceSchema,
  status: IncomeLedgerStatusSchema,

  // References for reconciliation
  referenceType: IncomeLedgerReferenceTypeSchema,
  referenceId: z.string().min(1), // paymentId / orderId / manual id
  paymentId: z.string().min(1).optional(),
  stripePaymentIntentId: z.string().min(1).optional(),
  stripeCheckoutSessionId: z.string().min(1).optional(),

  refundAmountCents: z.number().int().optional(),
  refundedAt: z.string().min(1).optional(),

  memberId: z.string().min(1).optional(),
  seasonYear: z.string().min(4).max(4).optional(),

  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
  createdBy: z.string().min(1).optional(),
  updatedBy: z.string().min(1).optional(),
});
export type IncomeLedgerEntryDoc = z.infer<typeof IncomeLedgerEntryDocSchema>;

export const CreateIncomeLedgerEntryBodySchema = z.object({
  date: z.string().min(1),
  amountCents: z.number().int(),
  gstIncluded: z.boolean().optional(),
  gstAmountCents: z.number().int().optional(),

  accountId: z.string().min(1).nullable().optional(),
  costCentreId: z.string().min(1).nullable().optional(),
  categoryName: z.string().min(1).max(160).optional(),

  description: z.string().min(1).max(400),
  referenceType: IncomeLedgerReferenceTypeSchema.optional(),
  referenceId: z.string().min(1).optional(),
  source: IncomeLedgerSourceSchema.optional(),
  memberId: z.string().min(1).optional(),
  seasonYear: z.string().regex(/^\d{4}$/).optional(),
});

