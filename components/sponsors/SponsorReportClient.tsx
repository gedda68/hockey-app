"use client";

// Sponsor reports: how often each sponsor's logo was shown and clicked, against the period before, with a page to
// send each sponsor and a spreadsheet of everything.

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import type { Report, SponsorLine } from "@/lib/sponsors/report";

type Data = Report & { org: { name: string; type: string; id: string }; reach: { members: number } | null };
const iso = (d: Date) => d.toISOString().slice(0, 10);
const PRESETS = [{ label: "Last 30 days", days: 30 }, { label: "Last 90 days", days: 90 }, { label: "Last 12 months", days: 365 }];

const Delta = ({ v }: { v: number | null }) => v === null ? <span className="text-xs font-semibold text-slate-300">no earlier data</span> : <span className={`text-xs font-black ${v >= 0 ? "text-emerald-700" : "text-red-600"}`}>{v >= 0 ? "▲" : "▼"} {Math.abs(v)}%</span>;

export default function SponsorReportClient({ scopeType, scopeId }: { scopeType?: "club" | "association"; scopeId?: string }) {
  const today = iso(new Date());
  const [from, setFrom] = useState(iso(new Date(Date.now() - 29 * 86400_000)));
  const [to, setTo] = useState(today);
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState("");

  const qs = useCallback((extra: Record<string, string> = {}) => {
    const q = new URLSearchParams({ from, to, ...extra });
    if (scopeType) q.set("scopeType", scopeType);
    if (scopeId) q.set("scopeId", scopeId);
    return q.toString();
  }, [from, to, scopeType, scopeId]);

  const load = useCallback(async () => {
    setData(null); setError("");
    const r = await fetch(`/api/admin/sponsor-report?${qs()}`, { credentials: "include", cache: "no-store" }).catch(() => null);
    const d = await r?.json().catch(() => ({}));
    if (r?.ok) setData(d); else setError(d?.error || "Couldn't load the report");
  }, [qs]);
  useEffect(() => { void load(); }, [load]);

  const preset = (days: number) => { setTo(today); setFrom(iso(new Date(Date.now() - (days - 1) * 86400_000))); };
  const max = (s: SponsorLine) => Math.max(1, ...s.daily.map((d) => d.impressions));

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
      <PageHeader eyebrow="Sponsors" title="Sponsor reports" subtitle="How often each sponsor's logo was shown and clicked, so you can show them what they get from backing you. Nothing about visitors is recorded." />
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border-2 border-slate-100 bg-white p-4">
        <label className="text-xs font-bold text-slate-600">From<input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className="mt-1 block rounded-lg border-2 border-slate-200 px-3 py-1.5 text-sm" /></label>
        <label className="text-xs font-bold text-slate-600">To<input type="date" value={to} min={from} max={today} onChange={(e) => setTo(e.target.value)} className="mt-1 block rounded-lg border-2 border-slate-200 px-3 py-1.5 text-sm" /></label>
        <div className="flex flex-wrap gap-2">{PRESETS.map((p) => <button key={p.days} type="button" onClick={() => preset(p.days)} className="rounded-lg border-2 border-slate-200 px-3 py-1.5 text-xs font-black text-slate-700">{p.label}</button>)}</div>
        <a href={`/api/admin/sponsor-report?${qs({ format: "csv" })}`} className="ml-auto rounded-xl bg-[#06054e] px-4 py-2 text-sm font-black text-white">Download spreadsheet</a>
      </div>
      {error ? <p className="rounded-2xl bg-white p-6 text-center text-sm font-semibold text-slate-500">{error}</p> : !data ? <div className="flex justify-center py-12"><Loader2 className="animate-spin text-slate-400" /></div> : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[["Times shown", data.totals.impressions], ["Clicks", data.totals.clicks], ["Click-through", `${data.totals.ctr}%`], [data.org.type === "club" ? "Club members" : "Sponsors", data.reach ? data.reach.members : data.sponsors.length]].map(([l, v]) => (
              <div key={String(l)} className="rounded-2xl border-2 border-slate-100 bg-white p-4"><p className="text-2xl font-black text-[#06054e]">{typeof v === "number" ? v.toLocaleString("en-AU") : v}</p><p className="text-xs font-bold uppercase tracking-wide text-slate-400">{l}</p></div>
            ))}
          </div>
          {data.sponsors.length === 0 ? <p className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-6 text-center text-sm font-semibold text-slate-400">No sponsors are listed yet. Add them in the club's settings and their numbers will appear here.</p> : (
            <div className="space-y-3">
              {data.sponsors.map((s) => (
                <div key={s.partnerRef} className="space-y-3 rounded-2xl border-2 border-slate-100 bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-lg font-black text-slate-800">{s.label || "(unnamed)"}</p>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setOpen(open === s.partnerRef ? "" : s.partnerRef)} className="rounded-lg border-2 border-slate-200 px-3 py-1.5 text-xs font-black text-slate-700">{open === s.partnerRef ? "Hide days" : "Day by day"}</button>
                      <a href={`/api/admin/sponsor-report?${qs({ format: "html", partner: s.partnerRef })}`} target="_blank" rel="noopener noreferrer" onClick={() => s.impressions === 0 && toast.message("No views in this period yet")} className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-black text-white">Report for sponsor</a>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div><p className="text-xl font-black text-[#06054e]">{s.impressions.toLocaleString("en-AU")}</p><p className="text-xs font-semibold text-slate-400">shown <Delta v={s.impressionsChange} /></p></div>
                    <div><p className="text-xl font-black text-[#06054e]">{s.clicks.toLocaleString("en-AU")}</p><p className="text-xs font-semibold text-slate-400">clicks <Delta v={s.clicksChange} /></p></div>
                    <div><p className="text-xl font-black text-[#06054e]">{s.ctr}%</p><p className="text-xs font-semibold text-slate-400">click-through</p></div>
                  </div>
                  <p className="text-xs font-semibold text-slate-500">Website {s.bySource.site.impressions.toLocaleString("en-AU")} shown, {s.bySource.site.clicks} clicks · Members' portal {s.bySource.portal.impressions.toLocaleString("en-AU")} shown, {s.bySource.portal.clicks} clicks</p>
                  {open === s.partnerRef && (
                    <div className="flex h-28 items-end gap-px">{s.daily.map((d) => <div key={d.day} title={`${d.day}: ${d.impressions} shown, ${d.clicks} clicks`} className="flex-1 rounded-t bg-[#06054e]/80" style={{ height: `${Math.max(2, (d.impressions / max(s)) * 100)}%` }} />)}</div>
                  )}
                </div>
              ))}
            </div>
          )}
          <p className="text-xs font-semibold text-slate-400">"Shown" counts once per visitor's browser tab each hour, on the public website and in the members' portal. Automated visits are left out. Comparisons are with the {data.previousRange.from} to {data.previousRange.to} period.</p>
        </>
      )}
    </div>
  );
}
