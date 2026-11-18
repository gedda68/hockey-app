"use client";

// Top of My fees: anything overdue, my payment plan with its instalments, or a way to ask the club for one.

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { FREQUENCIES, FREQUENCY_LABELS, money, type Frequency, type Instalment, type PlanProgress } from "@/lib/fees/plans";

interface View { today: string; plan: { planId: string; status: string; totalCents: number; instalments: Instalment[]; progress: PlanProgress | null; proposal?: { count: number; frequency: Frequency } } | null; canRequest: boolean; owingCents: number; overdueCents: number }
const dmy = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-AU", { day: "numeric", month: "short", timeZone: "UTC" });

export default function MyPlanCard() {
  const [v, setV] = useState<View | null>(null);
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState("4");
  const [frequency, setFrequency] = useState<Frequency>("fortnightly");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch("/api/member/fee-plans", { credentials: "include" }).catch(() => null);
    if (r?.ok) setV(await r.json());
  }, []);
  useEffect(() => { void load(); }, [load]);

  const send = async () => {
    setBusy(true);
    try {
      const r = await fetch("/api/member/fee-plans", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ count: Number(count), frequency, note }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "Couldn't send");
      toast.success("Request sent to your club");
      setOpen(false); await load();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't send"); } finally { setBusy(false); }
  };

  if (!v || (!v.plan && !v.overdueCents && !v.canRequest)) return null;
  const pr = v.plan?.progress;
  return (
    <section className="space-y-3 rounded-2xl border-2 border-slate-100 bg-white p-5">
      {v.overdueCents > 0 && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{money(v.overdueCents)} is overdue. Please pay when you can{v.canRequest ? ", or ask for a payment plan below" : ""}.</p>}
      {v.plan?.status === "requested" && <p className="text-sm font-bold text-slate-700">Your payment plan request has been sent{v.plan.proposal ? ` (${v.plan.proposal.count} ${FREQUENCY_LABELS[v.plan.proposal.frequency].toLowerCase()} instalments)` : ""}. The club will confirm it soon.</p>}
      {v.plan?.status === "active" && pr && (
        <div className="space-y-2">
          <p className="text-sm font-black text-[#06054e]">Your payment plan: {money(pr.paidCents)} of {money(pr.totalCents)} paid</p>
          <div className="h-2.5 rounded-full bg-slate-100"><div className="h-2.5 rounded-full bg-teal-500" style={{ width: `${(pr.paidCents / pr.totalCents) * 100}%` }} /></div>
          <ul className="space-y-1 text-sm font-semibold text-slate-700">
            {v.plan.instalments.map((i) => <li key={i.n} className="flex justify-between"><span>{dmy(i.dueDate)}{i.status !== "paid" && i.dueDate < v.today ? <span className="ml-2 text-xs font-black text-red-700">OVERDUE</span> : null}</span><span className={i.status === "paid" ? "text-emerald-700" : ""}>{money(i.amountCents)}{i.status === "paid" ? " paid" : ""}</span></li>)}
          </ul>
          <p className="text-xs font-medium text-slate-500">Pay each instalment to your club by its due date. The club records it here once received.</p>
        </div>
      )}
      {v.canRequest && (
        <div className="space-y-3">
          <button type="button" onClick={() => setOpen((o) => !o)} className="text-sm font-black text-teal-700 underline">Can't pay it all at once? Ask for a payment plan</button>
          {open && (
            <div className="space-y-3 rounded-xl bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-600">Split the {money(v.owingCents)} you owe into instalments. Your club approves it and sets the first date.</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs font-black uppercase text-slate-500">Instalments<input type="number" min={2} max={12} value={count} onChange={(e) => setCount(e.target.value)} className="mt-1 w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-semibold normal-case text-slate-800" /></label>
                <label className="text-xs font-black uppercase text-slate-500">How often<select value={frequency} onChange={(e) => setFrequency(e.target.value as Frequency)} className="mt-1 w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-semibold normal-case text-slate-800">{FREQUENCIES.map((f) => <option key={f} value={f}>{FREQUENCY_LABELS[f]}</option>)}</select></label>
              </div>
              <input value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} placeholder="Anything the club should know (optional)" className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-semibold text-slate-800" />
              <button type="button" disabled={busy} onClick={send} className="rounded-xl bg-[#06054e] px-5 py-2 text-sm font-black text-white disabled:opacity-50">Send request</button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
