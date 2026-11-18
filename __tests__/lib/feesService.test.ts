import { describe, it, expect, beforeEach, vi } from "vitest";

// Children and guardians are looked up by the real code from the database; here they're a fixed family.
vi.mock("@/lib/access/guardians", () => ({
  childrenOf: async (_db: unknown, id: string) => (id === "parent" ? [{ memberId: "kid1" }, { memberId: "kid2" }, { memberId: "kid3" }] : []),
  guardianIdsFor: async (_db: unknown, m: { memberId: string }) => (m.memberId.startsWith("kid") ? ["parent"] : []),
  isMinor: (dob: unknown) => dob === "minor",
}));
const sent = vi.hoisted(() => [] as { to: string; subject: string; text: string }[]);
vi.mock("@/lib/email/client", () => ({ sendEmail: async (m: { to: string; subject: string; text: string }) => { sent.push(m); return { success: true }; }, APP_URL: "https://app.test" }));

import { cancelPlan, familyDiscounts, overdueFor, processOverdueFees, recordInstalment, requestPlan, saveSettings, startPlan } from "@/lib/fees/service";

type Doc = Record<string, any>;
const eq = (a: any, b: any) => (b === null ? a === null || a === undefined : a === b);
function matches(d: Doc, q: Doc): boolean {
  return Object.entries(q).every(([k, v]) => {
    if (k === "$or") return (v as Doc[]).some((x) => matches(d, x));
    const val = k.split(".").reduce((o: any, p) => (Array.isArray(o) ? o.flatMap((x) => x?.[p]) : o?.[p]), d);
    if (v && typeof v === "object" && !(v instanceof Date)) {
      if ("$in" in v) return (v.$in as any[]).some((x) => (Array.isArray(val) ? val.includes(x) : eq(val, x)));
      if ("$ne" in v) return Array.isArray(val) ? !val.includes(v.$ne) : val !== v.$ne;
      if ("$exists" in v) return (val !== undefined) === v.$exists;
    }
    return eq(val, v);
  });
}
function apply(d: Doc, u: Doc) {
  Object.assign(d, u.$set ?? {});
  for (const k of Object.keys(u.$unset ?? {})) delete d[k];
  for (const [k, n] of Object.entries(u.$inc ?? {})) d[k] = (d[k] ?? 0) + (n as number);
  for (const [k, x] of Object.entries(u.$push ?? {})) (d[k] ??= []).push(x);
  for (const [k, x] of Object.entries(u.$addToSet ?? {})) { d[k] ??= []; if (!d[k].includes(x)) d[k].push(x); }
}
function makeDb(t: Record<string, Doc[]>) {
  const col = (name: string) => {
    const rows = (t[name] ??= []);
    const cur = (l: Doc[]) => ({ sort: () => cur(l), limit: () => cur(l), toArray: async () => l.map((x) => x) });
    return {
      find: (q: Doc = {}) => cur(rows.filter((d) => matches(d, q))),
      findOne: async (q: Doc) => rows.find((d) => matches(d, q)) ?? null,
      insertOne: async (d: Doc) => { rows.push(structuredClone(d)); },
      updateOne: async (q: Doc, u: Doc, o?: Doc) => { const d = rows.find((x) => matches(x, q)); if (d) apply(d, u); else if (o?.upsert) { const n = { ...q }; apply(n, u); rows.push(n); } return { matchedCount: d ? 1 : 0 }; },
      updateMany: async (q: Doc, u: Doc) => { const hit = rows.filter((d) => matches(d, q)); hit.forEach((d) => apply(d, u)); return { matchedCount: hit.length }; },
    };
  };
  return { collection: col } as never;
}

const pay = (paymentId: string, memberId: string, amount: number, extra: Doc = {}) => ({ paymentId, memberId, clubId: "chc", amount, status: "pending", createdAt: new Date("2026-11-01T00:00:00Z"), lineItems: [{ itemId: `i-${paymentId}`, type: "club", clubId: "chc", name: "Club fee", amount }], ...extra });

describe("payment plans", () => {
  let t: Record<string, Doc[]>;
  beforeEach(() => { t = { payments: [pay("P1", "m1", 300), pay("P2", "m1", 100), pay("P3", "m2", 50)], members: [], fee_plans: [] }; });

  it("starts a plan over the person's unpaid fees and links the payments to it", async () => {
    const db = makeDb(t);
    const r = await startPlan(db, { clubId: "chc", payerId: "m1", count: 4, frequency: "fortnightly", firstDue: "2026-12-01", by: "treasurer" });
    expect(r).toMatchObject({ ok: true, totalCents: 40000 });
    const plan = t.fee_plans[0];
    expect(plan.instalments.map((i: Doc) => i.amountCents)).toEqual([10000, 10000, 10000, 10000]);
    expect(t.payments.filter((p) => p.onPlanId === plan.planId).map((p) => p.paymentId)).toEqual(["P1", "P2"]);
    expect(t.payments[2].onPlanId).toBeUndefined(); // someone else's fee is untouched
  });
  it("won't start a second plan, or one with nothing to pay", async () => {
    const db = makeDb(t);
    await startPlan(db, { clubId: "chc", payerId: "m1", count: 2, frequency: "weekly", firstDue: "2026-12-01", by: "x" });
    expect(await startPlan(db, { clubId: "chc", payerId: "m1", count: 2, frequency: "weekly", firstDue: "2026-12-01", by: "x" })).toMatchObject({ ok: false, status: 409 });
    expect(await startPlan(db, { clubId: "chc", payerId: "nobody", count: 2, frequency: "weekly", firstDue: "2026-12-01", by: "x" })).toMatchObject({ ok: false, status: 400 });
  });
  it("a parent's plan covers their children's fees too", async () => {
    t.payments.push(pay("K1", "kid1", 200), pay("K2", "kid2", 200));
    const db = makeDb(t);
    const r = await requestPlan(db, "parent", "chc", { count: 4, frequency: "monthly" });
    expect(r.ok).toBe(true);
    expect(t.fee_plans[0]).toMatchObject({ status: "requested", totalCents: 40000 });
    expect(t.fee_plans[0].paymentIds).toEqual(["K1", "K2"]);
    expect(t.payments.every((p) => !p.onPlanId)).toBe(true); // a request commits nothing
    // approving it links them
    const a = await startPlan(db, { clubId: "chc", planId: t.fee_plans[0].planId, count: 4, frequency: "monthly", firstDue: "2026-12-01", by: "treasurer" });
    expect(a.ok).toBe(true);
    expect(t.fee_plans[0].status).toBe("active");
    expect(t.payments.filter((p) => p.onPlanId).map((p) => p.paymentId)).toEqual(["K1", "K2"]);
  });
  it("paying every instalment completes the plan and marks the fees paid; an instalment can't be paid twice", async () => {
    const db = makeDb(t);
    await startPlan(db, { clubId: "chc", payerId: "m1", count: 2, frequency: "weekly", firstDue: "2026-12-01", by: "x" });
    const id = t.fee_plans[0].planId;
    expect(await recordInstalment(db, id, 1, { method: "cash", by: "treasurer" })).toMatchObject({ ok: true, completed: false });
    expect(await recordInstalment(db, id, 1, { method: "cash", by: "treasurer" })).toMatchObject({ ok: false, status: 409 });
    expect(t.payments[0].status).toBe("pending");
    expect(await recordInstalment(db, id, 2, { method: "bank transfer", by: "treasurer" })).toMatchObject({ ok: true, completed: true });
    expect(t.fee_plans[0].status).toBe("completed");
    expect(t.payments.slice(0, 2).map((p) => [p.status, p.paymentMethod])).toEqual([["paid", "payment_plan"], ["paid", "payment_plan"]]);
    expect(t.payments[2].status).toBe("pending");
  });
  it("cancelling returns the fees to ordinary debts and keeps what was recorded", async () => {
    const db = makeDb(t);
    await startPlan(db, { clubId: "chc", payerId: "m1", count: 2, frequency: "weekly", firstDue: "2026-12-01", by: "x" });
    const id = t.fee_plans[0].planId;
    await recordInstalment(db, id, 1, { method: "cash", by: "x" });
    expect((await cancelPlan(db, id, "chc", "cancelled")).ok).toBe(true);
    expect(t.fee_plans[0].status).toBe("cancelled");
    expect(t.fee_plans[0].instalments[0].status).toBe("paid");
    expect(t.payments.every((p) => !p.onPlanId)).toBe(true);
    expect((await cancelPlan(db, id, "chc", "cancelled")).ok).toBe(false);
    expect((await cancelPlan(db, id, "other-club", "cancelled")).ok).toBe(false);
  });
});

describe("family discounts", () => {
  let t: Record<string, Doc[]>;
  beforeEach(() => {
    t = {
      payments: [pay("K1", "kid1", 400), pay("K2", "kid2", 300), pay("K3", "kid3", 300), pay("A1", "adult", 400)],
      members: ["kid1", "kid2", "kid3"].map((id) => ({ memberId: id, personalInfo: { firstName: id, lastName: "Smith", dateOfBirth: "minor" } })).concat([{ memberId: "adult", personalInfo: { firstName: "Al", lastName: "Jones", dateOfBirth: "adult" } } as never]),
      fee_settings: [], fee_plans: [],
    };
  });
  it("refuses until switched on", async () => {
    expect(await familyDiscounts(makeDb(t), "chc", false)).toMatchObject({ ok: false });
  });
  it("previews without changing anything", async () => {
    const db = makeDb(t);
    await saveSettings(db, "chc", { dueDays: 30, family: { enabled: true, secondPercent: 10, thirdPlusPercent: 20 } });
    const r = await familyDiscounts(db, "chc", false);
    expect(r.ok && r.discounts.map((d) => [d.memberId, d.discountCents])).toEqual([["kid2", 3000], ["kid3", 6000]]);
    expect(t.payments[1].amount).toBe(300);
  });
  it("applies once: lowers the amount, adds a visible discount line, and a second run adds nothing", async () => {
    const db = makeDb(t);
    await saveSettings(db, "chc", { dueDays: 30, family: { enabled: true, secondPercent: 10, thirdPlusPercent: 20 } });
    await familyDiscounts(db, "chc", true);
    const k2 = t.payments.find((p) => p.paymentId === "K2")!, k3 = t.payments.find((p) => p.paymentId === "K3")!;
    expect([k2.amount, k3.amount]).toEqual([270, 240]);
    expect(k2.lineItems.at(-1)).toMatchObject({ itemId: "family-discount", amount: -30, discount: true });
    expect(t.payments.find((p) => p.paymentId === "K1")!.amount).toBe(400); // the biggest fee pays in full
    expect(t.payments.find((p) => p.paymentId === "A1")!.amount).toBe(400); // adults aren't part of a family
    const again = await familyDiscounts(db, "chc", true);
    expect(again.ok && again.discounts).toEqual([]);
    expect(k2.amount).toBe(270);
  });
  it("leaves fees on a payment plan alone", async () => {
    const db = makeDb(t);
    await saveSettings(db, "chc", { dueDays: 30, family: { enabled: true, secondPercent: 10, thirdPlusPercent: 20 } });
    t.payments[1].onPlanId = "PLAN-X";
    const r = await familyDiscounts(db, "chc", false);
    expect(r.ok && r.discounts.map((d) => d.memberId)).toEqual(["kid3"]);
  });
});


describe("overdue reminders", () => {
  // Raised 1 Nov (Brisbane); due 30 days later, 1 Dec. Tue 1 Dec 2026 is not overdue yet; Wed 2 Dec is 1 day overdue.
  const NOON = (iso: string) => new Date(iso); // callers pass UTC instants
  let t: Record<string, Doc[]>;
  beforeEach(() => {
    sent.length = 0;
    t = {
      payments: [pay("P1", "m1", 200, { createdAt: new Date("2026-10-31T14:30:00Z") }), pay("K1", "kid1", 100, { createdAt: new Date("2026-10-31T14:30:00Z") })],
      members: [
        { memberId: "m1", personalInfo: { firstName: "Mo", dateOfBirth: "adult" }, contact: { primaryEmail: "mo@x.test" } },
        { memberId: "kid1", personalInfo: { firstName: "Kit", dateOfBirth: "minor" }, contact: {} },
        { memberId: "parent", personalInfo: { firstName: "Pat" }, contact: { primaryEmail: "pat@x.test" } },
      ],
      clubs: [{ id: "chc", name: "Commercial HC" }], fee_settings: [], fee_plans: [], fee_reminders: [],
    };
  });
  const at = (day: string) => NOON(`${day}T02:00:00Z`); // 12:00 Brisbane

  it("nothing before it's overdue", async () => {
    expect((await processOverdueFees(makeDb(t), at("2026-12-01"))).emailed).toBe(0);
  });
  it("one email per person, listing their fees; a junior's fee goes to the parent", async () => {
    const r = await processOverdueFees(makeDb(t), at("2026-12-02"));
    expect(r.emailed).toBe(2);
    const mo = sent.find((m) => m.to === "mo@x.test")!, pat = sent.find((m) => m.to === "pat@x.test")!;
    expect(mo.subject).toMatch(/\$200\.00 to Commercial HC/);
    expect(pat.text).toMatch(/Kit: Club fee, \$100\.00/);
  });
  it("doesn't repeat the same stage, then reminds again a week later", async () => {
    const db = makeDb(t);
    await processOverdueFees(db, at("2026-12-02"));
    sent.length = 0;
    expect((await processOverdueFees(db, at("2026-12-03"))).emailed).toBe(0);
    expect((await processOverdueFees(db, at("2026-12-09"))).emailed).toBe(2); // 8 days overdue: the 7-day stage
    sent.length = 0;
    expect((await processOverdueFees(db, at("2026-12-10"))).emailed).toBe(0);
  });
  it("not overnight", async () => {
    expect((await processOverdueFees(makeDb(t), new Date("2026-12-02T13:00:00Z"))).emailed).toBe(0); // 23:00 Brisbane
  });
  it("a fee on a payment plan is chased by its instalments, not the whole amount", async () => {
    const db = makeDb(t);
    await startPlan(db, { clubId: "chc", payerId: "m1", count: 2, frequency: "monthly", firstDue: "2026-12-01", by: "x" });
    await processOverdueFees(db, at("2026-12-02"));
    const mo = sent.find((m) => m.to === "mo@x.test")!;
    expect(mo.text).toMatch(/instalment 1 of 2, \$100\.00/);
    expect(mo.text).not.toMatch(/\$200\.00/);
  });
  it("overdueFor adds up what a parent owes for themselves and their children", async () => {
    t.payments.push(pay("K2", "kid2", 50, { createdAt: new Date("2026-10-31T14:30:00Z") }));
    const r = await overdueFor(makeDb(t), "parent", "2026-12-02");
    expect(r).toEqual({ overdueCents: 15000, count: 2 });
  });
});

import { registrationDiscount, withFamilyDiscount } from "@/lib/fees/registrationDiscount";

describe("family discount at registration", () => {
  const rules = { enabled: true, secondPercent: 10, thirdPlusPercent: 20 };
  it("first to register pays in full; second and later get their percentage", () => {
    expect(registrationDiscount(0, 30000, rules)).toBeNull();
    expect(registrationDiscount(1, 30000, rules)).toEqual({ rank: 2, percent: 10, discountCents: 3000 });
    expect(registrationDiscount(2, 30000, rules)).toEqual({ rank: 3, percent: 20, discountCents: 6000 });
    expect(registrationDiscount(5, 30000, rules)).toMatchObject({ rank: 6, percent: 20 });
  });
  it("nothing when off, free, or 0%", () => {
    expect(registrationDiscount(1, 30000, { ...rules, enabled: false })).toBeNull();
    expect(registrationDiscount(1, 0, rules)).toBeNull();
    expect(registrationDiscount(1, 30000, { ...rules, secondPercent: 0 })).toBeNull();
  });
  it("never takes off more than the fee", () => { expect(registrationDiscount(1, 500, { ...rules, secondPercent: 100 })?.discountCents).toBe(500); });

  let t: Record<string, Doc[]>;
  const items = () => [{ itemId: "club-1", type: "club", name: "Club fee", amount: 300, gstIncluded: true }, { itemId: "ins", type: "insurance", name: "Insurance", amount: 20, gstIncluded: false }];
  beforeEach(() => {
    t = {
      members: ["kid1", "kid2", "kid3"].map((id) => ({ memberId: id, personalInfo: { firstName: id, dateOfBirth: "minor" } })).concat([{ memberId: "adult", personalInfo: { dateOfBirth: "adult" } } as never]),
      payments: [], fee_settings: [{ clubId: "chc", dueDays: 30, family: { enabled: true, secondPercent: 10, thirdPlusPercent: 20 } }],
    };
  });
  const run = (memberId: string) => withFamilyDiscount(makeDb(t), { memberId, clubId: "chc", seasonYear: "2027", items: items() });

  it("no discount for the first child; a visible 10% line for the second; 20% for the third", async () => {
    expect((await run("kid1")).discount).toBeNull();
    t.payments.push(pay("A", "kid1", 320, { seasonYear: "2027" }));
    const second = await run("kid2");
    expect(second.discount).toMatchObject({ rank: 2, discountCents: 3000 });
    expect(second.items.at(-1)).toMatchObject({ itemId: "family-discount", amount: -30, discount: true, gstIncluded: true });
    t.payments.push(pay("B", "kid2", 290, { seasonYear: "2027" }));
    expect((await run("kid3")).discount).toMatchObject({ rank: 3, discountCents: 6000 });
  });
  it("the discount applies to the club fee only, not insurance", async () => {
    t.payments.push(pay("A", "kid1", 320, { seasonYear: "2027" }));
    expect((await run("kid2")).discount?.discountCents).toBe(3000); // 10% of $300, not of $320
  });
  it("only counts brothers and sisters registered this season at this club, and who still hold a fee", async () => {
    t.payments.push(pay("OLD", "kid1", 320, { seasonYear: "2026" }), pay("OTHER", "kid1", 320, { seasonYear: "2027", clubId: "other" }), pay("GONE", "kid1", 320, { seasonYear: "2027", status: "cancelled" }));
    expect((await run("kid2")).discount).toBeNull();
  });
  it("a paid sibling fee counts too", async () => {
    t.payments.push(pay("A", "kid1", 320, { seasonYear: "2027", status: "paid" }));
    expect((await run("kid2")).discount).not.toBeNull();
  });
  it("not for adults, when switched off, or when it's already been added", async () => {
    t.payments.push(pay("A", "kid1", 320, { seasonYear: "2027" }));
    expect((await run("adult")).discount).toBeNull();
    t.fee_settings[0].family.enabled = false;
    expect((await run("kid2")).discount).toBeNull();
    t.fee_settings[0].family.enabled = true;
    const again = await withFamilyDiscount(makeDb(t), { memberId: "kid2", clubId: "chc", seasonYear: "2027", items: [...items(), { itemId: "family-discount", type: "club", amount: -30 }] });
    expect(again.discount).toBeNull();
  });
});
