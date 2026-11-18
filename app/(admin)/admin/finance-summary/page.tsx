"use client";

// Treasurer's summary: what's billed, collected and owed; who owes; payment plans; family discounts and terms.

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Download, Loader2 } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import { FREQUENCIES, FREQUENCY_LABELS, money, type Frequency, type Instalment, type PlanProgress } from "@/lib/fees/plans";
import { BUCKET_LABELS, type Bucket } from "@/lib/fees/overdue";

interface Debtor { memberId: string; name: string; email: string; outstandingCents: number; overdueCents: number; oldestDaysOverdue: number; onPlan: boolean }
interface Summary { billedCents: number; collectedCents: number; outstandingCents: number; overdueCents: number; onPlansCents: number; plansActive: number; discountsCents: number; collectedThisMonthCents: number; collectionRate: number | null; ageing: Record<Bucket, number>; debtors: Debtor[] }
interface Settings { dueDays: number; family: { enabled: boolean; secondPercent: number; thirdPlusPercent: number } }
interface Plan { planId: string; memberId: string; name: string; status: string; totalCents: number; frequency?: string; instalments: Instalment[]; progress: PlanProgress | null; proposal?: { count: number; frequency: Frequency; note?: string } }

const inputCls = "w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-teal-400";
const labelCls = "mb-1 block text-xs font-black uppercase tracking-wide text-slate-500";
const card = "rounded-2xl border-2 border-slate-100 bg-white p-5";
const dmy = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

async function call(url: string, method = "GET", body?: unknown) {
  const r = await fetch(url, { method, credentials: "include", headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || "Failed");
  return d;
}

function PlanForm({ defaults, today, label, onSubmit }: { defaults?: { count: number; frequency: Frequency }; today: string; label: string; onSubmit: (v: { count: number; frequency: Frequency; firstDue: string }) => Promise<void> }) {
  const [count, setCount] = useState(String(defaults?.count ?? 4));
  const [frequency, setFrequency] = useState<Frequency>(defaults?.frequency ?? "fortnightly");
  const [firstDue, setFirstDue] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="grid items-end gap-3 sm:grid-cols-4">
      <div><label className={labelCls}>Instalments</label><input type="number" min={2} max={24} className={inputCls} value={count} onChange={(e) => setCount(e.target.value)} /></div>
      <div><label className={labelCls}>How often</label><select className={inputCls} value={frequency} onChange={(e) => setFrequency(e.target.value as Frequency)}>{FREQUENCIES.map((f) => <option key={f} value={f}>{FREQUENCY_LABELS[f]}</option>)}</select></div>
      <div><label className={labelCls}>First due</label><input type="date" min={today} className={inputCls} value={firstDue} onChange={(e) => setFirstDue(e.target.value)} /></div>
      <button type="button" disabled={busy || !firstDue} onClick={async () => { setBusy(true); try { await onSubmit({ count: Number(count), frequency, firstDue }); } finally { setBusy(false); } }} className="rounded-xl bg-[#06054e] px-4 py-2.5 text-sm font-black text-white disabled:opacity-50">{label}</button>
    </div>
  );
}

export default function FinanceSummaryPage() {
  const [data, setData] = useState<{ today: string; clubId: string | null; settings: Settings | null; summary: Summary; requestedPlans: number } | null>(null);
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [error, setError] = useState("");
  const [planFor, setPlanFor] = useState("");
  const [settings, setSettings] = useState<Settings | null>(null);
  const [disc, setDisc] = useState<{ families: number; discounts: { memberId: string; name: string; rank: number; percent: number; discountCents: number }[] } | null>(null);
  const [method, setMethod] = useState("bank transfer");

  const load = useCallback(async () => {
    try {
      const s = await call("/api/admin/fees-summary");
      setData(s); setSettings(s.settings);
      if (s.clubId) setPlans((await call("/api/admin/fee-plans")).plans); else setPlans([]);
    } catch (e) { setError(e instanceof Error ? e.message : "Couldn't load"); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const run = async (fn: () => Promise<unknown>, ok: string) => { try { await fn(); toast.success(ok); await load(); } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); } };
  const sum = data?.summary;
  const maxAge = sum ? Math.max(1, ...Object.values(sum.ageing)) : 1;
  const tile = (label: string, value: string, tone = "text-[#06054e]", sub?: string) => <div className={card}><p className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</p><p className={`text-2xl font-black ${tone}`}>{value}</p>{sub && <p className="text-xs font-semibold text-slate-500">{sub}</p>}</div>;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      <PageHeader eyebrow="Finance" title="Treasurer's summary" subtitle="What's been billed and collected, who owes, payment plans and family discounts."
        aside={sum && <a href="/api/admin/fees-summary?format=csv" className="inline-flex items-center gap-1.5 rounded-xl bg-white/95 px-4 py-2 text-sm font-black text-[#06054e]"><Download size={14} /> Who owes (CSV)</a>} />
      {error && <p className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}
      {!data && !error ? <div className="flex justify-center py-12"><Loader2 className="animate-spin text-slate-400" /></div> : data && sum && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {tile("Billed", money(sum.billedCents), undefined, sum.discountsCents ? `after ${money(sum.discountsCents)} family discounts` : undefined)}
            {tile("Collected", money(sum.collectedCents), "text-emerald-700", sum.collectionRate !== null ? `${sum.collectionRate}% of billed · ${money(sum.collectedThisMonthCents)} this month` : undefined)}
            {tile("Owing", money(sum.outstandingCents), "text-amber-700", sum.onPlansCents ? `${money(sum.onPlansCents)} on payment plans` : undefined)}
            {tile("Overdue", money(sum.overdueCents), sum.overdueCents ? "text-red-700" : "text-slate-700")}
          </div>

          <section className={card}>
            <h2 className="mb-3 text-sm font-black text-[#06054e]">How old is what's owing</h2>
            {(Object.keys(BUCKET_LABELS) as Bucket[]).map((b) => (
              <div key={b} className="mb-2 flex items-center gap-3 text-sm font-semibold text-slate-700">
                <span className="w-44 shrink-0">{BUCKET_LABELS[b]}</span>
                <div className="h-3 flex-1 rounded-full bg-slate-100"><div className={`h-3 rounded-full ${b === "notDue" ? "bg-teal-500" : b === "d1_30" ? "bg-amber-400" : "bg-red-500"}`} style={{ width: `${(sum.ageing[b] / maxAge) * 100}%` }} /></div>
                <span className="w-24 text-right tabular-nums text-slate-500">{money(sum.ageing[b])}</span>
              </div>
            ))}
          </section>

          <section className={card}>
            <h2 className="mb-3 text-sm font-black text-[#06054e]">Who owes the most</h2>
            {sum.debtors.length === 0 ? <p className="text-sm font-semibold text-slate-500">Nobody owes anything. Nice.</p> : (
              <ul className="divide-y divide-slate-100">
                {sum.debtors.map((d) => (
                  <li key={d.memberId} className="space-y-2 py-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="min-w-0 flex-1"><p className="truncate font-black text-slate-800">{d.name}</p><p className="truncate text-xs font-semibold text-slate-500">{d.email}</p></div>
                      <p className="text-sm font-black text-slate-700">{money(d.outstandingCents)}{d.overdueCents > 0 && <span className="ml-2 text-red-700">{money(d.overdueCents)} overdue, {d.oldestDaysOverdue}d</span>}</p>
                      {d.onPlan ? <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-black text-sky-800">On a plan</span> : data.clubId && <button type="button" onClick={() => setPlanFor(planFor === d.memberId ? "" : d.memberId)} className="rounded-lg border-2 border-slate-200 px-3 py-1 text-xs font-black text-slate-700">Set up a plan</button>}
                    </div>
                    {planFor === d.memberId && <PlanForm today={data.today} label="Start plan" onSubmit={async (v) => { await run(() => call("/api/admin/fee-plans", "POST", { action: "start", payerId: d.memberId, ...v }), `Plan started for ${d.name}`); setPlanFor(""); }} />}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {plans && plans.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-black uppercase tracking-wide text-slate-500">Payment plans</h2>
              {plans.map((p) => (
                <div key={p.planId} className={`${card} space-y-3`}>
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="flex-1 font-black text-slate-800">{p.name} <span className="ml-2 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-black capitalize text-slate-600">{p.status}</span></p>
                    <p className="text-sm font-bold text-slate-600">{money(p.totalCents)}{p.progress ? ` · ${money(p.progress.paidCents)} paid` : ""}</p>
                  </div>
                  {p.status === "requested" && p.proposal && (
                    <div className="space-y-3">
                      <p className="text-sm font-medium text-slate-600">Asked for {p.proposal.count} {FREQUENCY_LABELS[p.proposal.frequency].toLowerCase()} instalments.{p.proposal.note ? ` "${p.proposal.note}"` : ""}</p>
                      <PlanForm defaults={p.proposal} today={data.today} label="Approve plan" onSubmit={(v) => run(() => call("/api/admin/fee-plans", "POST", { action: "approve", planId: p.planId, ...v }), "Plan approved")} />
                      <button type="button" onClick={() => window.confirm("Decline this request?") && run(() => call("/api/admin/fee-plans", "POST", { action: "decline", planId: p.planId }), "Declined")} className="text-xs font-black text-red-700 underline">Decline</button>
                    </div>
                  )}
                  {p.instalments.length > 0 && (
                    <table className="min-w-full text-sm">
                      <tbody className="divide-y divide-slate-100">
                        {p.instalments.map((i) => {
                          const late = i.status !== "paid" && i.dueDate < data.today;
                          return (
                            <tr key={i.n}>
                              <td className="py-1.5 pr-3 font-bold text-slate-500">#{i.n}</td>
                              <td className="py-1.5 pr-3 font-semibold text-slate-700">{dmy(i.dueDate)}</td>
                              <td className="py-1.5 pr-3 font-black tabular-nums text-slate-800">{money(i.amountCents)}</td>
                              <td className="py-1.5 text-right">{i.status === "paid" ? <span className="text-xs font-bold text-emerald-700">Paid {i.paidAt ? dmy(i.paidAt.slice(0, 10)) : ""}{i.method ? ` (${i.method})` : ""}</span> : p.status === "active" ? <button type="button" onClick={() => run(() => call("/api/admin/fee-plans", "POST", { action: "record", planId: p.planId, n: i.n, method }), `Instalment ${i.n} recorded`)} className={`rounded-lg px-3 py-1 text-xs font-black ${late ? "bg-red-600 text-white" : "border-2 border-slate-200 text-slate-700"}`}>Record payment{late ? " (overdue)" : ""}</button> : null}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                  {p.status === "active" && (
                    <div className="flex flex-wrap items-center gap-3">
                      <label className="text-xs font-black uppercase text-slate-500">Received by</label>
                      <select className="rounded-lg border-2 border-slate-200 px-2 py-1 text-xs font-bold" value={method} onChange={(e) => setMethod(e.target.value)}>{["bank transfer", "cash", "card", "cheque", "other"].map((m) => <option key={m}>{m}</option>)}</select>
                      <button type="button" onClick={() => window.confirm("Cancel this plan? What has been paid stays recorded, and the rest goes back to normal fees.") && run(() => call("/api/admin/fee-plans", "POST", { action: "cancel", planId: p.planId }), "Plan cancelled")} className="ml-auto text-xs font-black text-red-700 underline">Cancel plan</button>
                    </div>
                  )}
                </div>
              ))}
            </section>
          )}

          {settings && data.clubId && (
            <section className={`${card} space-y-4`}>
              <h2 className="text-sm font-black text-[#06054e]">Terms and family discounts</h2>
              <div className="grid gap-4 sm:grid-cols-3">
                <div><label className={labelCls}>Fees are due after (days)</label><input type="number" min={1} max={180} className={inputCls} value={settings.dueDays} onChange={(e) => setSettings({ ...settings, dueDays: Number(e.target.value) })} /></div>
                <div><label className={labelCls}>2nd family member</label><input type="number" min={0} max={100} className={inputCls} value={settings.family.secondPercent} onChange={(e) => setSettings({ ...settings, family: { ...settings.family, secondPercent: Number(e.target.value) } })} /></div>
                <div><label className={labelCls}>3rd and later</label><input type="number" min={0} max={100} className={inputCls} value={settings.family.thirdPlusPercent} onChange={(e) => setSettings({ ...settings, family: { ...settings.family, thirdPlusPercent: Number(e.target.value) } })} /></div>
              </div>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700"><input type="checkbox" checked={settings.family.enabled} onChange={(e) => setSettings({ ...settings, family: { ...settings.family, enabled: e.target.checked } })} /> Give family discounts (percentage off the club fee for juniors who share a parent or guardian; the member paying the most pays in full)</label>
              <div className="flex flex-wrap gap-3">
                <button type="button" onClick={() => run(() => call("/api/admin/fee-settings", "PUT", settings), "Saved")} className="rounded-xl bg-[#06054e] px-5 py-2 text-sm font-black text-white">Save</button>
                <button type="button" disabled={!settings.family.enabled} onClick={async () => { try { setDisc(await call("/api/admin/family-discounts", "POST", { apply: false })); } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); } }} className="rounded-xl border-2 border-[#06054e] px-5 py-2 text-sm font-black text-[#06054e] disabled:opacity-40">Preview discounts on unpaid fees</button>
              </div>
              {disc && (
                <div className="space-y-2 rounded-xl bg-slate-50 p-4">
                  {disc.discounts.length === 0 ? <p className="text-sm font-semibold text-slate-600">No unpaid fees qualify for a family discount right now.</p> : (
                    <>
                      <ul className="space-y-1 text-sm font-semibold text-slate-700">{disc.discounts.map((d) => <li key={d.memberId}>{d.name}: {money(d.discountCents)} off ({d.percent}%, family member {d.rank})</li>)}</ul>
                      <button type="button" onClick={() => window.confirm(`Take ${money(disc.discounts.reduce((s, d) => s + d.discountCents, 0))} off ${disc.discounts.length} unpaid fees? Members will see a "Family discount" line.`) && run(async () => { await call("/api/admin/family-discounts", "POST", { apply: true }); setDisc(null); }, "Discounts applied")} className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-black text-white">Apply {disc.discounts.length} discounts</button>
                    </>
                  )}
                </div>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}
