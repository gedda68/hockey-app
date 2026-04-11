import { describe, expect, it } from "vitest";
import {
  aggregateRegistrationPayments,
  gstComponentFromLine,
} from "@/lib/financials/registrationPaymentSummary";

describe("registrationPaymentSummary", () => {
  it("extracts GST from GST-inclusive amounts", () => {
    const g = gstComponentFromLine(110, true);
    expect(Math.round(g * 100) / 100).toBe(10);
    expect(gstComponentFromLine(50, false)).toBe(0);
  });

  it("aggregates by club and association lines", () => {
    const summary = aggregateRegistrationPayments([
      {
        paymentId: "P1",
        clubId: "C1",
        status: "paid",
        amount: 100,
        lineItems: [
          {
            type: "association",
            name: "State",
            amount: 60,
            gstIncluded: true,
            associationId: "A1",
          },
          {
            type: "club",
            name: "Club fee",
            amount: 40,
            gstIncluded: false,
            clubId: "C1",
          },
        ],
      },
      {
        paymentId: "P2",
        clubId: "C1",
        status: "pending",
        amount: 20,
        lineItems: [],
      },
    ]);

    expect(summary.totals.paymentCount).toBe(2);
    expect(summary.totals.lineItemCount).toBe(2);
    expect(summary.byClub).toHaveLength(1);
    expect(summary.byClub[0].clubId).toBe("C1");
    expect(summary.byAssociation).toHaveLength(1);
    expect(summary.byAssociation[0].associationId).toBe("A1");
    expect(summary.totals.byPaymentStatus.paid.count).toBe(1);
    expect(summary.totals.byPaymentStatus.pending.count).toBe(1);
  });
});
