"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

type Row = { partnerRef: string; label: string; clicks: number };

export default function PartnerClickStatsClient({
  title,
  apiPath,
}: {
  title: string;
  /** e.g. `/api/admin/associations/bha/partner-click-stats` */
  apiPath: string;
}) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(
    async (fromQ?: string, toQ?: string) => {
      setLoading(true);
      try {
        const q = new URLSearchParams();
        if (fromQ) q.set("from", fromQ);
        if (toQ) q.set("to", toQ);
        const qs = q.toString();
        const res = await fetch(`${apiPath}${qs ? `?${qs}` : ""}`, { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(typeof data.error === "string" ? data.error : "Load failed");
        }
        setRows(Array.isArray(data.rows) ? data.rows : []);
        if (data.range?.from) setFrom(String(data.range.from));
        if (data.range?.to) setTo(String(data.range.to));
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Load failed");
      } finally {
        setLoading(false);
      }
    },
    [apiPath],
  );

  useEffect(() => {
    void fetchStats();
  }, [fetchStats]);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-black text-[#06054e]">{title}</h1>
        <p className="mt-2 text-sm text-slate-600">
          Aggregated outbound clicks on the public partner strip only. No cookies, sessions, or
          visitor identifiers — suitable for renewal conversations with sponsors.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <label className="text-xs font-bold text-slate-600">
          From (UTC)
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="mt-1 block rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-xs font-bold text-slate-600">
          To (UTC)
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="mt-1 block rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
        <button
          type="button"
          onClick={() => void fetchStats(from, to)}
          className="rounded-xl bg-[#06054e] px-4 py-2 text-sm font-black text-white hover:bg-[#0a0968]"
        >
          Apply
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <p className="p-8 text-sm text-slate-500">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="p-8 text-sm text-slate-500">No clicks in this range.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-xs font-black uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Partner</th>
                <th className="px-4 py-3 text-right">Clicks</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.partnerRef} className="border-b border-slate-50">
                  <td className="px-4 py-3 font-semibold text-slate-800">
                    {r.label || "(unnamed)"}
                    <div className="mt-0.5 font-mono text-[10px] font-normal text-slate-400">
                      {r.partnerRef}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-black text-[#06054e]">{r.clicks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
