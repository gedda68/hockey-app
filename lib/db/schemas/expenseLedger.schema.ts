import { z } from "zod";

export const ExpenseLedgerSourceSchema = z.enum([
  "manual_cash",
  "manual_bank_transfer",
  "manual_card",
  "manual_other",
  "umpire_honorarium",
  "bulk_import",
]);

export type ExpenseLedgerSource = z.infer<typeof ExpenseLedgerSourceSchema>;

export const ExpenseLedgerStatusSchema = z.enum(["paid", "voided", "reversed"]);
export type ExpenseLedgerStatus = z.infer<typeof ExpenseLedgerStatusSchema>;

export const ExpenseLedgerReferenceTypeSchema = z.enum([
  "umpire_payment_line",
  "invoice",
  "manual",
  "bulk_import_row",
]);

export type ExpenseLedgerReferenceType = z.infer<typeof ExpenseLedgerReferenceTypeSchema>;

export const ExpenseLedgerEntryDocSchema = z.object({
  entryId: z.string().min(1),
  scopeType: z.enum(["association", "club"]),
  scopeId: z.string().min(1),

  date: z.string().min(1),
  /** Outgoing amount in cents (positive). */
  amountCents: z.number().int().min(0),
  gstIncluded: z.boolean().default(false),
  gstAmountCents: z.number().int().default(0),

  accountId: z.string().min(1).nullable().optional(),
  costCentreId: z.string().min(1).nullable().optional(),
  categoryName: z.string().min(1).max(160).optional(),

  description: z.string().min(1).max(400),

  source: ExpenseLedgerSourceSchema,
  status: ExpenseLedgerStatusSchema,

  referenceType: ExpenseLedgerReferenceTypeSchema,
  referenceId: z.string().min(1),

  seasonCompetitionId: z.string().min(1).optional(),
  fixtureId: z.string().min(1).optional(),
  payeeMemberId: z.string().min(1).optional(),
  payeeLabel: z.string().min(1).max(200).optional(),
  seasonYear: z.string().regex(/^\d{4}$/).optional(),

  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
  createdBy: z.string().min(1).optional(),
  updatedBy: z.string().min(1).optional(),
});

export type ExpenseLedgerEntryDoc = z.infer<typeof ExpenseLedgerEntryDocSchema>;

export const CreateExpenseLedgerEntryBodySchema = z.object({
  date: z.string().min(1),
  amountCents: z.number().int().min(1),
  gstIncluded: z.boolean().optional(),
  gstAmountCents: z.number().int().optional(),

  accountId: z.string().min(1).nullable().optional(),
  costCentreId: z.string().min(1).nullable().optional(),
  categoryName: z.string().min(1).max(160).optional(),

  description: z.string().min(1).max(400),
  referenceType: ExpenseLedgerReferenceTypeSchema.optional(),
  referenceId: z.string().min(1).optional(),
  source: ExpenseLedgerSourceSchema.optional(),
  seasonYear: z.string().regex(/^\d{4}$/).optional(),
});
