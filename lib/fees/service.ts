// lib/fees/service.ts
// The database side of fees: settings, payment plans, family discounts and overdue reminders. The rules themselves
// (instalments, discounts, stages) live in the pure modules beside this one and are tested there.

import { randomBytes } from "node:crypto";
import type { Db } from "mongodb";
import { sendEmail } from "@/lib/email/client";
import { buildOverdueEmail, type OverdueLine } from "@/lib/email/templates/feeOverdue";
import { childrenOf, guardianIdsFor, isMinor } from "@/lib/access/guardians";
import { DEFAULT_RULES, cleanRules, groupFamilies, planFamilyDiscounts, type FamilyRules } from "@/lib/fees/familyDiscount";
import { DEFAULT_DUE_DAYS, daysOverdue, dayOf, dueDateOf, nextStage } from "@/lib/fees/overdue";
import { buildInstalments, planProgress, money, type Frequency, type Instalment } from "@/lib/fees/plans";
import type { SumPayment } from "@/lib/fees/summary";
import { isQuietHour } from "@/lib/rsvp/logic";

export const PLANS = "fee_plans";
export const SETTINGS = "fee_settings";
export const REMINDERS = "fee_reminders";
const newId = (p: string) => `${p}-${Date.now().toString(36)}-${randomBytes(3).toString("hex")}`;

export interface FeeSettings { clubId: string; dueDays: number; family: FamilyRules }
export async function loadSettings(db: Db, clubId: string): Promise<FeeSettings> {
  const s = await db.collection(SETTINGS).findOne({ clubId }, { projection: { _id: 0 } });
  const dueDays = Math.min(180, Math.max(1, Math.round(Number(s?.dueDays) || DEFAULT_DUE_DAYS)));
  return { clubId, dueDays, family: s?.family ? cleanRules(s.family) : DEFAULT_RULES };
}
export async function saveSettings(db: Db, clubId: string, body: { dueDays?: unknown; family?: unknown }): Promise<FeeSettings> {
  const dueDays = Math.min(180, Math.max(1, Math.round(Number(body.dueDays) || DEFAULT_DUE_DAYS)));
  const family = cleanRules(body.family);
  await db.collection(SETTINGS).updateOne({ clubId }, { $set: { clubId, dueDays, family, updatedAt: new Date().toISOString() } }, { upsert: true });
  return { clubId, dueDays, family };
}

// ── Reading payments ─────────────────────────────────────────────────────────

const iso = (v: unknown): string => (v instanceof Date ? v.toISOString() : v ? String(v) : "");
export const centsOf = (p: any): number => (Number.isFinite(p.amountCents) ? Math.round(p.amountCents) : Math.round(Number(p.amount ?? 0) * 100));

export function toSumPayment(p: any): SumPayment {
  const discount = ((p.lineItems ?? []) as { amount?: number; discount?: boolean }[]).filter((l) => l.discount && Number(l.amount) < 0).reduce((s, l) => s + Math.round(-Number(l.amount) * 100), 0);
  return { paymentId: String(p.paymentId), memberId: String(p.memberId), amountCents: centsOf(p), status: String(p.status), createdAt: iso(p.createdAt), dueDate: p.dueDate ? iso(p.dueDate) : null, paidDate: p.paidDate ? iso(p.paidDate) : null, onPlanId: p.onPlanId ?? null, discountCents: discount };
}

export const nameOf = (m: any) => `${m?.personalInfo?.firstName ?? m?.firstName ?? ""} ${m?.personalInfo?.lastName ?? m?.lastName ?? ""}`.trim();
const emailOf = (m: any) => String(m?.contact?.primaryEmail ?? m?.contact?.email ?? "").trim();

// ── Payment plans ────────────────────────────────────────────────────────────

export type Out<T = object> = ({ ok: true } & T) | { ok: false; status: number; error: string };
const fail = (status: number, error: string) => ({ ok: false as const, status, error });

/** The pending, un-planned payments this person is answerable for: their own and their children's. */
async function payablePayments(db: Db, payerId: string, paymentIds: string[] | null, clubId: string | null) {
  const kids = (await childrenOf(db, payerId).catch(() => [])).map((k: any) => String(k.memberId));
  const q: Record<string, unknown> = { memberId: { $in: [payerId, ...kids] }, status: "pending", onPlanId: null };
  if (paymentIds) q.paymentId = { $in: paymentIds };
  if (clubId) q.clubId = clubId;
  const rows = await db.collection("payments").find(q).limit(100).toArray();
  return rows.filter((r) => !r.onPlanId);
}

export async function requestPlan(db: Db, payerId: string, clubId: string | null, proposal: { count: number; frequency: Frequency; note?: string }): Promise<Out<{ planId: string }>> {
  if (await db.collection(PLANS).findOne({ memberId: payerId, status: { $in: ["requested", "active"] } })) return fail(409, "You already have a payment plan or a request waiting");
  const pays = await payablePayments(db, payerId, null, clubId);
  const total = pays.reduce((s, p) => s + centsOf(p), 0);
  if (!pays.length || total <= 0) return fail(400, "You have nothing outstanding to put on a plan");
  const planId = newId("PLAN");
  await db.collection(PLANS).insertOne({ planId, clubId: clubId ?? String(pays[0].clubId ?? ""), memberId: payerId, paymentIds: pays.map((p) => String(p.paymentId)), totalCents: total, status: "requested", proposal: { count: proposal.count, frequency: proposal.frequency, note: String(proposal.note ?? "").slice(0, 300) }, instalments: [], createdBy: payerId, createdAt: new Date().toISOString() });
  return { ok: true, planId };
}

/** Starts a plan: the treasurer sets it up directly, or approves a member's request. Links the payments to it. */
export async function startPlan(db: Db, o: { planId?: string; payerId?: string; clubId: string; paymentIds?: string[]; count: number; frequency: Frequency; firstDue: string; by: string }): Promise<Out<{ planId: string; totalCents: number }>> {
  const plan = o.planId ? await db.collection(PLANS).findOne({ planId: o.planId }) : null;
  if (o.planId && (!plan || plan.status !== "requested" || plan.clubId !== o.clubId)) return fail(404, "That request isn't waiting for approval");
  const payerId = String(plan?.memberId ?? o.payerId ?? "");
  if (!payerId) return fail(400, "Choose who is paying");
  if (!plan && (await db.collection(PLANS).findOne({ memberId: payerId, status: "active" }))) return fail(409, "They already have an active payment plan");
  const pays = await payablePayments(db, payerId, plan ? (plan.paymentIds as string[]) : o.paymentIds ?? null, o.clubId);
  if (!pays.length) return fail(400, "There is nothing outstanding to put on a plan (it may have been paid or already be on a plan)");
  const totalCents = pays.reduce((s, p) => s + centsOf(p), 0);
  const inst = buildInstalments(totalCents, o.count, o.frequency, o.firstDue);
  if (!inst.ok) return fail(400, inst.error);
  const planId = plan ? String(plan.planId) : newId("PLAN");
  const fields = { paymentIds: pays.map((p) => String(p.paymentId)), totalCents, frequency: o.frequency, instalments: inst.instalments, status: "active", approvedBy: o.by, startedAt: new Date().toISOString() };
  if (plan) await db.collection(PLANS).updateOne({ planId }, { $set: fields });
  else await db.collection(PLANS).insertOne({ planId, clubId: o.clubId, memberId: payerId, ...fields, createdBy: o.by, createdAt: new Date().toISOString() });
  await db.collection("payments").updateMany({ paymentId: { $in: fields.paymentIds } }, { $set: { onPlanId: planId, updatedAt: new Date() } });
  return { ok: true, planId, totalCents };
}

export async function recordInstalment(db: Db, planId: string, n: number, o: { method: string; note?: string; by: string }, now: Date = new Date()): Promise<Out<{ completed: boolean }>> {
  const plan = await db.collection(PLANS).findOne({ planId, status: "active" });
  if (!plan) return fail(404, "That plan isn't active");
  const inst = (plan.instalments as Instalment[]).map((i) => (i.n === n && i.status !== "paid" ? { ...i, status: "paid" as const, paidAt: now.toISOString(), method: o.method.slice(0, 40), ...(o.note ? { note: o.note.slice(0, 200) } : {}), recordedBy: o.by } : i));
  if (inst.every((i, k) => i === (plan.instalments as Instalment[])[k])) return fail(409, "That instalment is already paid");
  const complete = inst.every((i) => i.status === "paid");
  await db.collection(PLANS).updateOne({ planId }, { $set: { instalments: inst, ...(complete ? { status: "completed", completedAt: now.toISOString() } : {}) } });
  if (complete) await db.collection("payments").updateMany({ paymentId: { $in: plan.paymentIds as string[] }, status: "pending" }, { $set: { status: "paid", paidDate: now, paymentMethod: "payment_plan", updatedAt: now } });
  return { ok: true, completed: complete };
}

/** Ends a plan early: what was paid stays recorded on the plan, and the payments go back to being ordinary debts. */
export async function cancelPlan(db: Db, planId: string, clubId: string, status: "cancelled" | "declined"): Promise<Out> {
  const plan = await db.collection(PLANS).findOne({ planId, clubId, status: { $in: ["active", "requested"] } });
  if (!plan) return fail(404, "That plan isn't open");
  await db.collection(PLANS).updateOne({ planId }, { $set: { status, endedAt: new Date().toISOString() } });
  await db.collection("payments").updateMany({ onPlanId: planId }, { $unset: { onPlanId: "" }, $set: { updatedAt: new Date() } });
  return { ok: true };
}

// ── Family discounts ─────────────────────────────────────────────────────────

const ordinal = (n: number) => (n === 2 ? "2nd" : n === 3 ? "3rd" : `${n}th`);

export async function familyDiscounts(db: Db, clubId: string, apply: boolean): Promise<Out<{ rules: FamilyRules; discounts: { memberId: string; name: string; paymentId: string; rank: number; percent: number; discountCents: number }[]; families: number }>> {
  const { family: rules } = await loadSettings(db, clubId);
  if (!rules.enabled) return fail(400, "Turn family discounts on in the settings first");
  const pays = await db.collection("payments").find({ clubId, status: "pending", onPlanId: null }).limit(2000).toArray();
  const open = pays.filter((p) => !p.onPlanId && !((p.lineItems ?? []) as { itemId?: string }[]).some((l) => l.itemId === "family-discount"));
  const eligible = open.map((p) => ({ memberId: String(p.memberId), paymentId: String(p.paymentId), clubFeeCents: ((p.lineItems ?? []) as { type?: string; amount?: number }[]).filter((l) => l.type === "club" && Number(l.amount) > 0).reduce((s, l) => s + Math.round(Number(l.amount) * 100), 0) })).filter((e) => e.clubFeeCents > 0);
  const ids = [...new Set(eligible.map((e) => e.memberId))];
  const members = ids.length ? await db.collection("members").find({ memberId: { $in: ids } }, { projection: { memberId: 1, personalInfo: 1, firstName: 1, lastName: 1, family: 1, relatedPersons: 1, guardians: 1 } }).toArray() : [];
  const links: { memberId: string; guardianIds: string[] }[] = [];
  for (const m of members) links.push({ memberId: String(m.memberId), guardianIds: isMinor(m.personalInfo?.dateOfBirth) ? await guardianIdsFor(db, m).catch(() => [] as string[]) : [] });
  const families = groupFamilies(links);
  const plan = planFamilyDiscounts(families, eligible, rules);
  const nm = new Map(members.map((m) => [String(m.memberId), nameOf(m)]));
  if (apply) {
    for (const d of plan) {
      const dollars = d.discountCents / 100;
      await db.collection("payments").updateOne({ paymentId: d.paymentId, status: "pending", "lineItems.itemId": { $ne: "family-discount" } }, {
        $push: { lineItems: { itemId: "family-discount", feeId: "family-discount", type: "club", clubId, name: `Family discount (${ordinal(d.rank)} family member, ${d.percent}%)`, amount: -dollars, discount: true, gstIncluded: false } } as never,
        $inc: { amount: -dollars }, $set: { updatedAt: new Date() },
      });
      await db.collection("payments").updateOne({ paymentId: d.paymentId, amountCents: { $exists: true } }, { $inc: { amountCents: -d.discountCents } });
    }
  }
  return { ok: true, rules, families: families.length, discounts: plan.map((d) => ({ ...d, name: nm.get(d.memberId) ?? d.memberId })) };
}

// ── Overdue reminders ────────────────────────────────────────────────────────

/** Who gets told about this person's fees: themselves, or their parents or guardians when they're a junior. */
async function recipientsFor(db: Db, memberId: string, cache: Map<string, any[]>): Promise<any[]> {
  const hit = cache.get(memberId);
  if (hit) return hit;
  const m = await db.collection("members").findOne({ memberId }, { projection: { memberId: 1, personalInfo: 1, firstName: 1, lastName: 1, contact: 1, notificationPrefs: 1, family: 1, relatedPersons: 1, guardians: 1 } });
  let out: any[] = m ? [m] : [];
  if (m && isMinor(m.personalInfo?.dateOfBirth)) {
    const gids = await guardianIdsFor(db, m).catch(() => [] as string[]);
    if (gids.length) out = await db.collection("members").find({ memberId: { $in: gids } }, { projection: { memberId: 1, personalInfo: 1, firstName: 1, contact: 1, notificationPrefs: 1 } }).toArray();
  }
  cache.set(memberId, out);
  return out;
}

export async function processOverdueFees(db: Db, now: Date = new Date(), budgetMs = 20_000, maxEmails = 150): Promise<{ checked: number; emailed: number }> {
  const out = { checked: 0, emailed: 0 };
  if (isQuietHour(now)) return out;
  const started = Date.now();
  const today = dayOf(now.toISOString());
  const settings = new Map<string, number>((await db.collection(SETTINGS).find({}, { projection: { clubId: 1, dueDays: 1 } }).limit(1000).toArray()).map((s) => [String(s.clubId), Number(s.dueDays) || DEFAULT_DUE_DAYS]));
  const plans = await db.collection(PLANS).find({ status: "active" }).limit(1000).toArray();
  const onPlan = new Set(plans.map((p) => String(p.planId)));

  type Item = { key: string; stage: number; payer: string; line: OverdueLine; clubId: string; plan: boolean; forId: string };
  const items: Item[] = [];
  const pays = await db.collection("payments").find({ status: "pending" }).sort({ createdAt: 1 }).limit(3000).toArray();
  const keys = [...pays.filter((p) => !p.onPlanId || !onPlan.has(String(p.onPlanId))).map((p) => `pay:${p.paymentId}`), ...plans.flatMap((p) => (p.instalments as Instalment[]).filter((i) => i.status !== "paid").map((i) => `inst:${p.planId}:${i.n}`))];
  const sentRows = keys.length ? await db.collection(REMINDERS).find({ key: { $in: keys } }, { projection: { key: 1, stages: 1 } }).toArray() : [];
  const sent = new Map(sentRows.map((r) => [String(r.key), (r.stages as number[]) ?? []]));

  for (const p of pays) {
    if (p.onPlanId && onPlan.has(String(p.onPlanId))) continue;
    out.checked++;
    const due = dueDateOf({ createdAt: iso(p.createdAt), dueDate: p.dueDate ? iso(p.dueDate) : null }, settings.get(String(p.clubId ?? "")) ?? DEFAULT_DUE_DAYS);
    const days = daysOverdue(due, today);
    const key = `pay:${p.paymentId}`;
    const stage = nextStage(days, sent.get(key) ?? []);
    if (stage === null) continue;
    const label = ((p.lineItems ?? []) as { name?: string }[])[0]?.name ?? "Fees";
    items.push({ key, stage, payer: String(p.memberId), forId: String(p.memberId), clubId: String(p.clubId ?? ""), plan: false, line: { label, amountCents: centsOf(p), dueText: due, daysOverdue: days } });
  }
  for (const pl of plans) for (const i of pl.instalments as Instalment[]) {
    if (i.status === "paid") continue;
    out.checked++;
    const days = daysOverdue(i.dueDate, today);
    const key = `inst:${pl.planId}:${i.n}`;
    const stage = nextStage(days, sent.get(key) ?? []);
    if (stage === null) continue;
    items.push({ key, stage, payer: String(pl.memberId), forId: String(pl.memberId), clubId: String(pl.clubId ?? ""), plan: true, line: { label: `Payment plan, instalment ${i.n} of ${(pl.instalments as Instalment[]).length}`, amountCents: i.amountCents, dueText: i.dueDate, daysOverdue: days } });
  }

  // One email per person, listing everything of theirs that's due a reminder.
  const cache = new Map<string, any[]>();
  const byRecipient = new Map<string, { to: any; items: Item[] }>();
  for (const it of items) {
    for (const r of await recipientsFor(db, it.payer, cache)) {
      const e = byRecipient.get(String(r.memberId)) ?? { to: r, items: [] };
      if (!e.items.includes(it)) e.items.push(it);
      byRecipient.set(String(r.memberId), e);
    }
  }
  const clubNames = new Map<string, string>();
  const names = new Map<string, string>();
  const done = new Set<string>();
  for (const { to, items: list } of byRecipient.values()) {
    if (Date.now() - started > budgetMs || out.emailed >= maxEmails) break;
    const club = list[0].clubId;
    if (club && !clubNames.has(club)) clubNames.set(club, String((await db.collection("clubs").findOne({ $or: [{ id: club }, { clubId: club }] }, { projection: { name: 1 } }))?.name ?? "your club"));
    const lines: OverdueLine[] = [];
    for (const it of list) {
      let who = "";
      if (it.forId !== String(to.memberId)) {
        if (!names.has(it.forId)) names.set(it.forId, nameOf(await db.collection("members").findOne({ memberId: it.forId }, { projection: { personalInfo: 1, firstName: 1, lastName: 1 } })));
        who = names.get(it.forId) ?? "";
      }
      lines.push({ ...it.line, ...(who ? { forName: who.split(" ")[0] } : {}) });
    }
    if (emailOf(to) && to.notificationPrefs?.enabled !== false) {
      const mail = buildOverdueEmail({ name: String(to.personalInfo?.firstName ?? to.firstName ?? ""), clubName: clubNames.get(club) ?? "your club", lines, onPlan: list.every((i) => i.plan) });
      if ((await sendEmail({ to: emailOf(to), ...mail })).success) out.emailed++;
    }
    for (const it of list) done.add(`${it.key}|${it.stage}`);
  }
  // Marked for everything handled, even when there was no address to use, so nobody is retried every hour.
  for (const d of done) { const [key, stage] = d.split("|"); await db.collection(REMINDERS).updateOne({ key }, { $addToSet: { stages: Number(stage) }, $set: { lastSentAt: now.toISOString() } }, { upsert: true }); }
  return out;
}

/** What a person (and their children, as a parent) owes that is past due, for the in-app notice and My fees. */
export async function overdueFor(db: Db, memberId: string, today: string): Promise<{ overdueCents: number; count: number }> {
  const kids = (await childrenOf(db, memberId).catch(() => [])).map((k: any) => String(k.memberId));
  const plans = await db.collection(PLANS).find({ memberId, status: "active" }).toArray();
  const onPlan = new Set(plans.map((p) => String(p.planId)));
  const pays = await db.collection("payments").find({ memberId: { $in: [memberId, ...kids] }, status: "pending" }, { projection: { paymentId: 1, amount: 1, amountCents: 1, createdAt: 1, dueDate: 1, clubId: 1, onPlanId: 1 } }).limit(100).toArray();
  const dueDaysByClub = new Map<string, number>();
  for (const c of new Set(pays.map((p) => String(p.clubId ?? "")))) dueDaysByClub.set(c, c ? (await loadSettings(db, c)).dueDays : DEFAULT_DUE_DAYS);
  let cents = 0, count = 0;
  for (const p of pays) {
    if (p.onPlanId && onPlan.has(String(p.onPlanId))) continue;
    if (daysOverdue(dueDateOf({ createdAt: iso(p.createdAt), dueDate: p.dueDate ? iso(p.dueDate) : null }, dueDaysByClub.get(String(p.clubId ?? "")) ?? DEFAULT_DUE_DAYS), today) > 0) { cents += centsOf(p); count++; }
  }
  for (const pl of plans) { const pr = planProgress(pl.instalments as Instalment[], today); cents += pr.overdueCents; count += pr.overdueCount; }
  return { overdueCents: cents, count };
}

export { money };
