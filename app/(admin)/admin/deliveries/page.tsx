// Delivery log: what the club's notifications reached people through, and who they failed for.

"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, RotateCw } from "lucide-react";

interface Row { category: string; channel: string; sent: number; failed: number }
interface Failure { memberId: string; name: string; channel: string; category: string; title: string; dedupeKey: string; error: string; at: string }
interface Data { days: number; summary: Row[]; failedTotal: number; failures: Failure[] }

const CHANNEL: Record<string, string> = { inApp: "In the app", email: "Email", sms: "SMS", social: "WhatsApp" };
const CATEGORY: Record<string, string> = { matches: "Matches", nominations: "Nominations", events: "Events", membership: "Membership", approvals: "Approvals", announcements: "Announcements" };
const when = (iso: string) => new Date(iso).toLocaleString("en-AU", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

async function api(url: string, init?: RequestInit) {
  const r = await fetch(url, { credentials: "include", headers: { "Content-Type": "application/json" }, ...init });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || "Something went wrong");
  return d;
}

export default function DeliveriesPage() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [days, setDays] = useState(30);
  const [category, setCategory] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try { setData(await api(`/api/admin/deliveries?days=${days}${category ? `&category=${category}` : ""}`)); setError(""); }
    catch (e) { setError(e instanceof Error ? e.message : "Couldn't load"); }
  }, [days, category]);
  useEffect(() => { load(); }, [load]);

  const resend = async (body: Record<string, string>) => {
    setBusy(true);
    try {
      const d = await api("/api/admin/deliveries/resend", { method: "POST", body: JSON.stringify(body) });
      toast.success(`Tried ${d.attempted}: ${d.sent} sent, ${d.failed} still failing${d.skipped ? `, ${d.skipped} skipped` : ""}${d.capped ? " (more remain, run it again)" : ""}`);
      await load();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); } finally { setBusy(false); }
  };

  if (error) return <div className="p-6 text-sm font-bold text-red-600">{error}</div>;
  if (!data) return <div className="p-6"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>;
  const categories = [...new Set(data.summary.map((s) => s.category))];

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black text-[#06054e]">Delivery log</h1>
          <p className="mt-1 text-sm font-semibold text-slate-500">What your club's notifications reached people through. Each person is counted once per message and channel.</p>
        </div>
        <div className="flex gap-2 text-sm font-bold">
          <select className="rounded-xl border-2 border-slate-200 px-3 py-2" value={days} onChange={(e) => setDays(Number(e.target.value))}><option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option></select>
          <select className="rounded-xl border-2 border-slate-200 px-3 py-2" value={category} onChange={(e) => setCategory(e.target.value)}><option value="">All types</option>{Object.entries(CATEGORY).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        </div>
      </div>

      {data.summary.length === 0 ? (
        <p className="rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center text-sm font-semibold text-slate-400">Nothing has been delivered in this period.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border-2 border-slate-100 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead><tr className="border-b border-slate-100 text-xs font-black uppercase tracking-wide text-slate-400"><th className="p-3">Type</th>{Object.values(CHANNEL).map((c) => <th key={c} className="p-3">{c}</th>)}</tr></thead>
            <tbody>
              {categories.map((cat) => (
                <tr key={cat} className="border-b border-slate-50 last:border-0">
                  <td className="p-3 font-black text-slate-800">{CATEGORY[cat] ?? cat}</td>
                  {Object.keys(CHANNEL).map((ch) => {
                    const r = data.summary.find((s) => s.category === cat && s.channel === ch);
                    return <td key={ch} className="p-3 font-semibold text-slate-600">{r ? <>{r.sent}{r.failed > 0 && <span className="font-black text-red-600"> · {r.failed} failed</span>}</> : <span className="text-slate-300">–</span>}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data.failedTotal > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-black text-slate-800">Failed deliveries ({data.failedTotal})</h2>
            <button disabled={busy} onClick={() => resend(category ? { category } : {})} className="inline-flex items-center gap-2 rounded-xl bg-teal-500 px-4 py-2 text-sm font-black text-white disabled:opacity-50">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCw className="h-4 w-4" />} Resend all failed
            </button>
          </div>
          <ul className="divide-y divide-slate-100 rounded-2xl border-2 border-slate-100 bg-white text-sm shadow-sm">
            {data.failures.map((f, i) => (
              <li key={`${f.dedupeKey}${f.channel}${f.memberId}${i}`} className="flex flex-wrap items-center justify-between gap-2 p-3">
                <div>
                  <div className="font-black text-slate-800">{f.name} <span className="font-semibold text-slate-500">· {CHANNEL[f.channel] ?? f.channel}</span></div>
                  <div className="text-xs font-semibold text-slate-500">{f.title || CATEGORY[f.category] || f.category} · {when(f.at)}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-red-600">{f.error}</span>
                  <button disabled={busy} onClick={() => resend({ dedupeKey: f.dedupeKey, channel: f.channel })} className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-black text-slate-600 disabled:opacity-50">Retry</button>
                </div>
              </li>
            ))}
          </ul>
          <p className="text-xs font-semibold text-slate-400">"No email address" or "No valid mobile number" means the member's record needs fixing first. Retrying skips anyone who has since switched that channel off.</p>
        </div>
      )}
    </div>
  );
}
