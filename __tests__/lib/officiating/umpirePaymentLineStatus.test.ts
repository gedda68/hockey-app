import { describe, expect, it } from "vitest";
import { isAllowedUmpirePaymentTransition } from "@/lib/officiating/umpirePaymentLineStatus";

describe("isAllowedUmpirePaymentTransition", () => {
  it("allows pending→approved and approved→paid", () => {
    expect(isAllowedUmpirePaymentTransition("pending", "approved")).toBe(true);
    expect(isAllowedUmpirePaymentTransition("approved", "paid")).toBe(true);
  });

  it("disallows skips and reversals", () => {
    expect(isAllowedUmpirePaymentTransition("pending", "paid")).toBe(false);
    expect(isAllowedUmpirePaymentTransition("approved", "pending")).toBe(false);
    expect(isAllowedUmpirePaymentTransition("paid", "approved")).toBe(false);
  });
});
