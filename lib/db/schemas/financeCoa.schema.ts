import { z } from "zod";

export const FinanceScopeTypeSchema = z.enum(["association", "club"]);
export type FinanceScopeType = z.infer<typeof FinanceScopeTypeSchema>;

export const FinanceAccountTypeSchema = z.enum([
  "income",
  "expense",
  "asset",
  "liability",
  "equity",
]);
export type FinanceAccountType = z.infer<typeof FinanceAccountTypeSchema>;

export const FinanceAccountDocSchema = z.object({
  accountId: z.string().min(1),
  scopeType: FinanceScopeTypeSchema,
  scopeId: z.string().min(1),

  code: z.string().min(1).max(32), // human-managed unique code per scope
  name: z.string().min(1).max(120),
  type: FinanceAccountTypeSchema,

  active: z.boolean().default(true),

  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
  createdBy: z.string().min(1).optional(),
  updatedBy: z.string().min(1).optional(),
});
export type FinanceAccountDoc = z.infer<typeof FinanceAccountDocSchema>;

export const FinanceCostCentreDocSchema = z.object({
  costCentreId: z.string().min(1),
  scopeType: FinanceScopeTypeSchema,
  scopeId: z.string().min(1),

  code: z.string().min(1).max(32),
  name: z.string().min(1).max(120),
  active: z.boolean().default(true),

  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
  createdBy: z.string().min(1).optional(),
  updatedBy: z.string().min(1).optional(),
});
export type FinanceCostCentreDoc = z.infer<typeof FinanceCostCentreDocSchema>;

export const CreateFinanceAccountBodySchema = z.object({
  code: z.string().min(1).max(32),
  name: z.string().min(1).max(120),
  type: FinanceAccountTypeSchema,
});

export const PatchFinanceAccountBodySchema = z
  .object({
    code: z.string().min(1).max(32).optional(),
    name: z.string().min(1).max(120).optional(),
    type: FinanceAccountTypeSchema.optional(),
    active: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "No fields to update" });

export const CreateCostCentreBodySchema = z.object({
  code: z.string().min(1).max(32),
  name: z.string().min(1).max(120),
});

export const PatchCostCentreBodySchema = z
  .object({
    code: z.string().min(1).max(32).optional(),
    name: z.string().min(1).max(120).optional(),
    active: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "No fields to update" });

