import { describe, expect, it } from "vitest";
import {
  PatchUmpirePaymentLinesBodySchema,
  PatchUmpirePaymentLineItemSchema,
} from "@/lib/db/schemas/umpireMatchPayment.schema";

describe("PatchUmpirePaymentLineItemSchema", () => {
  it("accepts status-only, amount-only, or both", () => {
    expect(() =>
      PatchUmpirePaymentLineItemSchema.parse({
        paymentLineId: "x",
        status: "approved",
      }),
    ).not.toThrow();
    expect(() =>
      PatchUmpirePaymentLineItemSchema.parse({
        paymentLineId: "x",
        amountCents: 5000,
      }),
    ).not.toThrow();
    expect(() =>
      PatchUmpirePaymentLineItemSchema.parse({
        paymentLineId: "x",
        status: "paid",
        amountCents: 0,
      }),
    ).not.toThrow();
  });

  it("rejects empty item", () => {
    expect(() =>
      PatchUmpirePaymentLineItemSchema.parse({ paymentLineId: "x" }),
    ).toThrow();
  });
});

describe("PatchUmpirePaymentLinesBodySchema", () => {
  it("accepts batch of mixed updates", () => {
    const parsed = PatchUmpirePaymentLinesBodySchema.parse({
      items: [
        { paymentLineId: "a", status: "approved" },
        { paymentLineId: "b", amountCents: 4200 },
      ],
    });
    expect(parsed.items).toHaveLength(2);
  });
});
