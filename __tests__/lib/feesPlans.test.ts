import { describe, it, expect } from "vitest";
import { addPeriods, buildInstalments, money, planProgress } from "@/lib/fees/plans";
import { cleanRules, groupFamilies, planFamilyDiscounts } from "@/lib/fees/familyDiscount";
import { bucketFor, daysOverdue, dueDateOf, nextStage } from "@/lib/fees/overdue";

describe("payment plan instalments", () => {
  it("splits to the cent with odd cents on the first instalment", () => {
    const r = buildInstalments(30000, 4, "fortnightly", "2026-12-01");
    expect(r.ok && r.instalments.map((i) => i.amountCents)).toEqual([7500, 7500, 7500, 7500]);
    const o = buildInstalments(10001, 3, "weekly", "2026-12-01");
    expect(o.ok && o.instalments.map((i) => i.amountCents)).toEqual([3335, 3333, 3333]);
    expect(o.ok && o.instalments.reduce((s, i) => s + i.amountCents, 0)).toBe(10001);
  });
  it("dates step weekly, fortnightly and monthly (clamped to month end)", () => {
    expect(addPeriods("2026-12-01", "weekly", 2)).toBe("2026-12-15");
    expect(addPeriods("2026-12-01", "fortnightly", 3)).toBe("2027-01-12");
    expect(addPeriods("2027-01-31", "monthly", 1)).toBe("2027-02-28");
    expect(addPeriods("2027-01-31", "monthly", 2)).toBe("2027-03-31");
    expect(addPeriods("2026-11-30", "monthly", 3)).toBe("2027-02-28");
  });
  it("refuses silly plans", () => {
    expect(buildInstalments(0, 3, "weekly", "2026-12-01").ok).toBe(false);
    expect(buildInstalments(30000, 1, "weekly", "2026-12-01").ok).toBe(false);
    expect(buildInstalments(30000, 30, "weekly", "2026-12-01").ok).toBe(false);
    expect(buildInstalments(300, 4, "weekly", "2026-12-01").ok).toBe(false); // under $1 each
    expect(buildInstalments(30000, 3, "weekly", "2026-02-30").ok).toBe(false);
  });
  it("progress: remaining, overdue the day after due, next, complete", () => {
    const r = buildInstalments(30000, 3, "weekly", "2026-12-01");
    if (!r.ok) throw new Error();
    const i = r.instalments.map((x, k) => (k === 0 ? { ...x, status: "paid" as const } : x));
    const p = planProgress(i, "2026-12-09");
    expect(p).toMatchObject({ totalCents: 30000, paidCents: 10000, remainingCents: 20000, overdueCents: 10000, overdueCount: 1, complete: false });
    expect(p.next?.n).toBe(2);
    expect(planProgress(i, "2026-12-08").overdueCount).toBe(0); // due that day, not yet overdue
    expect(planProgress(i.map((x) => ({ ...x, status: "paid" as const })), "2027-01-01").complete).toBe(true);
  });
  it("formats money", () => { expect(money(123456)).toBe("$1,234.56"); expect(money(-500)).toBe("-$5.00"); });
});

describe("family discounts", () => {
  it("groups siblings, and cousins linked through a shared guardian, but not unrelated kids", () => {
    const f = groupFamilies([{ memberId: "k1", guardianIds: ["p1"] }, { memberId: "k2", guardianIds: ["p1", "p2"] }, { memberId: "k3", guardianIds: ["p2"] }, { memberId: "k4", guardianIds: ["p9"] }, { memberId: "adult", guardianIds: [] }]);
    expect(f.map((x) => x.join(",")).sort()).toEqual(["k1,k2,k3", "k4"]);
  });
  const rules = { enabled: true, secondPercent: 10, thirdPlusPercent: 20 };
  const el = (memberId: string, paymentId: string, clubFeeCents: number) => ({ memberId, paymentId, clubFeeCents });
  it("highest fee pays in full; second gets 10%, third and later 20%", () => {
    const d = planFamilyDiscounts([["a", "b", "c", "d"]], [el("a", "P1", 30000), el("b", "P2", 40000), el("c", "P3", 20000), el("d", "P4", 10000)], rules);
    expect(d.map((x) => [x.memberId, x.rank, x.percent, x.discountCents])).toEqual([["a", 2, 10, 3000], ["c", 3, 20, 4000], ["d", 4, 20, 2000]]);
  });
  it("only family members with a fee count; a single payer gets nothing; disabled gives nothing", () => {
    expect(planFamilyDiscounts([["a", "b"]], [el("a", "P1", 30000)], rules)).toEqual([]);
    expect(planFamilyDiscounts([["a", "b"]], [el("a", "P1", 30000), el("b", "P2", 30000)], { ...rules, enabled: false })).toEqual([]);
    expect(planFamilyDiscounts([["a", "b"]], [el("a", "P1", 0), el("b", "P2", 30000)], rules)).toEqual([]);
  });
  it("discount covers all of someone's club fees but lands on their biggest payment", () => {
    const d = planFamilyDiscounts([["a", "b"]], [el("a", "P1", 40000), el("b", "P2", 10000), el("b", "P3", 20000)], rules);
    expect(d).toEqual([{ memberId: "b", paymentId: "P3", rank: 2, percent: 10, discountCents: 3000 }]);
  });
  it("cleans rules", () => {
    expect(cleanRules({ enabled: true, secondPercent: 150, thirdPlusPercent: "x" })).toEqual({ enabled: true, secondPercent: 100, thirdPlusPercent: 20 });
    expect(cleanRules(null).enabled).toBe(false);
  });
});

describe("overdue", () => {
  it("due date is the set date, else terms after it was raised (in Brisbane time)", () => {
    expect(dueDateOf({ createdAt: "2026-11-01T20:00:00Z" }, 30)).toBe("2026-12-02"); // raised 2 Nov local
    expect(dueDateOf({ createdAt: "2026-11-01T00:00:00Z", dueDate: "2026-11-20T00:00:00Z" }, 30)).toBe("2026-11-20");
  });
  it("days overdue never negative", () => { expect(daysOverdue("2026-12-01", "2026-12-04")).toBe(3); expect(daysOverdue("2026-12-10", "2026-12-04")).toBe(0); });
  it("one reminder at each stage; catches up with the latest only", () => {
    expect(nextStage(0, [])).toBeNull();
    expect(nextStage(1, [])).toBe(1);
    expect(nextStage(5, [1])).toBeNull();
    expect(nextStage(7, [1])).toBe(7);
    expect(nextStage(20, [])).toBe(14); // a long-overdue fee isn't hit with four emails at once
    expect(nextStage(100, [1, 7, 14, 28])).toBeNull();
  });
  it("ageing buckets", () => {
    expect([0, 1, 30, 31, 60, 61, 90, 91].map(bucketFor)).toEqual(["notDue", "d1_30", "d1_30", "d31_60", "d31_60", "d61_90", "d61_90", "d90plus"]);
  });
});

import { debtorsCsv, treasurerSummary, type SumPayment } from "@/lib/fees/summary";

describe("treasurer summary", () => {
  const today = "2026-12-15";
  const pay = (o: Partial<SumPayment> & { paymentId: string }): SumPayment => ({ memberId: "m1", amountCents: 10000, status: "pending", createdAt: "2026-11-01T00:00:00Z", ...o });
  it("billed, collected, outstanding, overdue and ageing", () => {
    const s = treasurerSummary([
      pay({ paymentId: "P1", status: "paid", paidDate: "2026-12-10T00:00:00Z", amountCents: 20000 }),
      pay({ paymentId: "P2", status: "paid", paidDate: "2026-11-10T00:00:00Z", amountCents: 5000 }),
      pay({ paymentId: "P3", memberId: "m2", createdAt: "2026-11-20T00:00:00Z", amountCents: 8000 }), // due 20 Dec: not yet due
      pay({ paymentId: "P4", memberId: "m3", createdAt: "2026-09-01T00:00:00Z", amountCents: 6000 }), // due 1 Oct: 75 days overdue
      pay({ paymentId: "P5", status: "refunded", amountCents: 99999 }),
      pay({ paymentId: "P6", status: "cancelled", amountCents: 99999 }),
    ], [], today, 30);
    expect(s).toMatchObject({ billedCents: 39000, collectedCents: 25000, outstandingCents: 14000, overdueCents: 6000, collectedThisMonthCents: 20000, collectionRate: 64.1 });
    expect(s.ageing).toEqual({ notDue: 8000, d1_30: 0, d31_60: 0, d61_90: 6000, d90plus: 0 });
    expect(s.debtors.map((d) => d.memberId)).toEqual(["m3", "m2"]); // overdue first
  });
  it("a payment on an active plan is carried by the plan: instalments paid count as collected, overdue ones as overdue, nothing counted twice", () => {
    const plan = { planId: "PL1", memberId: "m1", status: "active", instalments: [
      { n: 1, dueDate: "2026-12-01", amountCents: 5000, status: "paid" as const, paidAt: "2026-12-02T00:00:00Z" },
      { n: 2, dueDate: "2026-12-10", amountCents: 5000, status: "due" as const },
      { n: 3, dueDate: "2026-12-24", amountCents: 5000, status: "due" as const },
    ] };
    const s = treasurerSummary([pay({ paymentId: "P1", amountCents: 15000, onPlanId: "PL1", createdAt: "2026-10-01T00:00:00Z" })], [plan], today, 30);
    expect(s).toMatchObject({ billedCents: 15000, collectedCents: 5000, outstandingCents: 10000, overdueCents: 5000, onPlansCents: 10000, plansActive: 1, collectedThisMonthCents: 5000 });
    expect(s.ageing).toEqual({ notDue: 5000, d1_30: 5000, d31_60: 0, d61_90: 0, d90plus: 0 });
    expect(s.debtors[0]).toMatchObject({ memberId: "m1", outstandingCents: 10000, onPlan: true, oldestDaysOverdue: 5 });
  });
  it("a payment on a cancelled plan is treated as an ordinary debt again", () => {
    const s = treasurerSummary([pay({ paymentId: "P1", onPlanId: "PL9", createdAt: "2026-09-01T00:00:00Z" })], [{ planId: "PL9", memberId: "m1", status: "cancelled", instalments: [] }], today, 30);
    expect(s.outstandingCents).toBe(10000);
    expect(s.overdueCents).toBe(10000);
  });
  it("counts discounts given, and has no collection rate when nothing is billed", () => {
    expect(treasurerSummary([pay({ paymentId: "P1", status: "paid", discountCents: 3000 })], [], today, 30).discountsCents).toBe(3000);
    expect(treasurerSummary([], [], today, 30).collectionRate).toBeNull();
  });
  it("csv neutralises formula cells and quotes commas", () => {
    const csv = debtorsCsv([{ name: "=HYPERLINK(1)", email: "a@b.c", outstandingCents: 12345, overdueCents: 0, oldestDaysOverdue: 0, onPlan: false }, { name: "Smith, Al", email: "", outstandingCents: 100, overdueCents: 100, oldestDaysOverdue: 3, onPlan: true }]);
    expect(csv.split("\n")[1]).toBe("'=HYPERLINK(1),a@b.c,123.45,0.00,0,No");
    expect(csv.split("\n")[2]).toBe('"Smith, Al",,1.00,1.00,3,Yes');
  });
});
