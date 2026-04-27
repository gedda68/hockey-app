"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type Entry = {
  entryId: string;
  date: string;
  amountCents: number;
  gstIncluded: boolean;
  gstAmountCents: number;
  description: string;
  categoryName?: string;
  source: string;
  status: string;
  referenceType: string;
  referenceId: string;
};

function dollars(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function AssociationExpenseLedgerClient({ associationId }: { associationId: string }) {
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    date: new Date().toISOString(),
    amountCents: 0,
    gstIncluded: false,
    gstAmountCents: 0,
    categoryName: "",
    description: "",
    source: "manual_cash",
    referenceId: "",
    seasonYear: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/associations/${encodeURIComponent(associationId)}/finance/expense-ledger?limit=300`,
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to load expense ledger");
      setEntries((json.entries ?? []) as Entry[]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [associationId]);

  useEffect(() => {
    void load();
  }, [load]);

  const totals = useMemo(() => {
    let amount = 0;
    let gst = 0;
    for (const e of entries) {
      if (e.status === "voided" || e.status === "reversed") continue;
      amount += e.amountCents ?? 0;
      gst += e.gstAmountCents ?? 0;
    }
    return { amount, gst };
  }, [entries]);

  async function createManual() {
    try {
      if (!form.description.trim()) throw new Error("Description is required");
      if (!Number.isFinite(form.amountCents) || form.amountCents <= 0) throw new Error("Amount must be > 0");

      const res = await fetch(`/api/admin/associations/${encodeURIComponent(associationId)}/finance/expense-ledger`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: form.date,
          amountCents: Number(form.amountCents),
          gstIncluded: Boolean(form.gstIncluded),
          gstAmountCents: Number(form.gstAmountCents) || 0,
          categoryName: form.categoryName.trim() || undefined,
          description: form.description.trim(),
          source: form.source,
          referenceId: form.referenceId.trim() || undefined,
          seasonYear: form.seasonYear.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to create expense entry");
      toast.success("Expense entry created");
      setForm((s) => ({
        ...s,
        amountCents: 0,
        gstAmountCents: 0,
        categoryName: "",
        description: "",
        referenceId: "",
        seasonYear: "",
      }));
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  }

  if (loading) return <div className="p-6 text-sm text-slate-600">Loading…</div>;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-black text-[#06054e]">Financials · Expense ledger</h1>
            <p className="text-sm text-slate-600 mt-1">
              Manual outgoings and paid umpire honorarium lines (F3). CSV bulk import can be added to bulk-import later.
            </p>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm">
            <div className="font-black text-slate-900">Total (current view)</div>
            <div className="mt-1 text-slate-700">
              {dollars(totals.amount)} <span className="text-slate-400">·</span> GST: {dollars(totals.gst)}
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-900 rounded-xl p-4 text-sm font-semibold">
            {error}
          </div>
        )}

        <div className="bg-white border border-slate-200 rounded-3xl p-5 mb-6">
          <div className="font-black text-slate-900 mb-3">Add manual expense</div>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <input
              className="input input-bordered md:col-span-2"
              value={form.description}
              placeholder="Description (e.g. Venue hire — North Fields)"
              onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
            />
            <input
              className="input input-bordered"
              value={form.categoryName}
              placeholder="Category (optional)"
              onChange={(e) => setForm((s) => ({ ...s, categoryName: e.target.value }))}
            />
            <input
              className="input input-bordered"
              type="number"
              value={form.amountCents}
              placeholder="Amount (cents)"
              onChange={(e) => setForm((s) => ({ ...s, amountCents: Number(e.target.value) }))}
            />
            <input
              className="input input-bordered"
              type="number"
              value={form.gstAmountCents}
              placeholder="GST (cents)"
              onChange={(e) => setForm((s) => ({ ...s, gstAmountCents: Number(e.target.value) }))}
            />
            <select
              className="select select-bordered"
              value={form.source}
              onChange={(e) => setForm((s) => ({ ...s, source: e.target.value }))}
            >
              <option value="manual_cash">Cash</option>
              <option value="manual_bank_transfer">Bank transfer</option>
              <option value="manual_card">Card / EFTPOS</option>
              <option value="manual_other">Other</option>
            </select>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-xs text-slate-600">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.gstIncluded}
                  onChange={(e) => setForm((s) => ({ ...s, gstIncluded: e.target.checked }))}
                />
                GST included
              </label>
              <input
                className="input input-bordered input-sm w-40"
                value={form.seasonYear}
                placeholder="YYYY"
                onChange={(e) => setForm((s) => ({ ...s, seasonYear: e.target.value }))}
              />
              <input
                className="input input-bordered input-sm w-56"
                value={form.referenceId}
                placeholder="Reference (optional)"
                onChange={(e) => setForm((s) => ({ ...s, referenceId: e.target.value }))}
              />
            </div>
            <button onClick={createManual} className="btn bg-[#06054e] text-[#FFD700] hover:bg-[#0b0a66] border-none">
              Create entry
            </button>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="font-black text-slate-900">Entries</div>
            <div className="text-xs text-slate-500">{entries.length} rows</div>
          </div>
          {entries.length === 0 ? (
            <div className="p-5 text-sm text-slate-600">No expense entries yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th className="text-right">Amount</th>
                    <th className="text-right">GST</th>
                    <th>Ref</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e) => (
                    <tr key={e.entryId}>
                      <td className="text-xs text-slate-600 whitespace-nowrap">
                        {new Date(e.date).toLocaleString()}
                      </td>
                      <td className="font-semibold text-slate-900">{e.description}</td>
                      <td className="text-sm text-slate-700">{e.categoryName ?? "—"}</td>
                      <td className="text-xs">
                        <span className="badge badge-outline">{e.status}</span>{" "}
                        <span className="opacity-60">·</span>{" "}
                        <span className="opacity-70">{e.source}</span>
                      </td>
                      <td className="text-right font-mono">{dollars(e.amountCents)}</td>
                      <td className="text-right font-mono">{dollars(e.gstAmountCents)}</td>
                      <td className="text-xs font-mono text-slate-600 break-all">
                        {e.referenceType}:{e.referenceId}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
