// Incident reports: anyone in the club can report; the people who run the club manage them.

"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Lock, Send } from "lucide-react";

import PageHeader from "@/components/admin/PageHeader";
interface Incident { incidentId: string; occurredAt: string; category: string; severity: string; description: string; location?: string; status: string; confidential: boolean; reportedByName?: string }

const inputCls = "w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-teal-400";
const labelCls = "mb-1 block text-xs font-black uppercase tracking-wide text-slate-400";
const when = (iso: string) => new Date(iso).toLocaleString("en-AU", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
const CATEGORIES = [["injury", "Injury"], ["conduct", "Conduct"], ["child-safety", "Child safety"], ["property", "Property"], ["other", "Other"]];

async function api(url: string, init?: RequestInit) {
  const r = await fetch(url, { credentials: "include", headers: { "Content-Type": "application/json" }, ...init });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || "Something went wrong");
  return d;
}

export default function IncidentsPage() {
  const [rows, setRows] = useState<Incident[] | null>(null);
  const [level, setLevel] = useState("own");
  const [form, setForm] = useState({ occurredAt: "", category: "injury", severity: "low", location: "", description: "", actionTaken: "", confidential: false });
  const [busy, setBusy] = useState(false);
  const canEdit = level === "edit" || level === "admin";

  const load = useCallback(async () => {
    try { const d = await api("/api/records/incidents"); setRows(d.incidents ?? []); setLevel(d.level ?? "own"); }
    catch (e) { setRows([]); toast.error(e instanceof Error ? e.message : "Couldn't load"); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    setBusy(true);
    try {
      await api("/api/records/incidents", { method: "POST", body: JSON.stringify(form) });
      toast.success("Report submitted");
      setForm({ occurredAt: "", category: "injury", severity: "low", location: "", description: "", actionTaken: "", confidential: false });
      await load();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); } finally { setBusy(false); }
  };

  const setStatus = async (i: Incident, status: string) => {
    try { await api(`/api/records/incidents/${i.incidentId}`, { method: "PATCH", body: JSON.stringify({ status }) }); await load(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <PageHeader eyebrow="Welfare" title="Incidents" subtitle={<>Report something that happened. {canEdit ? "You can review and manage every report for your club." : "Only you and the club's administrators can see what you report."}</>} />

      <div className="space-y-4 rounded-2xl border-2 border-slate-100 bg-white p-5 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className={labelCls}>When</label><input type="datetime-local" className={inputCls} value={form.occurredAt} onChange={(e) => setForm({ ...form, occurredAt: e.target.value })} /></div>
          <div><label className={labelCls}>Where</label><input className={inputCls} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
          <div><label className={labelCls}>Category</label>
            <select className={inputCls} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{CATEGORIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
          <div><label className={labelCls}>Severity</label>
            <select className={inputCls} value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></div>
          <div className="sm:col-span-2"><label className={labelCls}>What happened</label><textarea className={inputCls} rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div className="sm:col-span-2"><label className={labelCls}>Action taken</label><textarea className={inputCls} rows={2} value={form.actionTaken} onChange={(e) => setForm({ ...form, actionTaken: e.target.value })} /></div>
        </div>
        <button onClick={submit} disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-teal-500 px-4 py-2 text-sm font-black text-white disabled:opacity-50">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Submit report
        </button>
      </div>

      {rows === null ? <Loader2 className="h-6 w-6 animate-spin text-slate-400" /> : rows.length === 0 ? (
        <p className="rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center text-sm font-semibold text-slate-400">No reports.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((i) => (
            <li key={i.incidentId} className="rounded-2xl border-2 border-slate-100 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 font-black capitalize text-slate-800">{i.category.replace("-", " ")}{i.confidential && <Lock className="h-3.5 w-3.5 text-slate-400" aria-label="Confidential" />}</div>
                  <div className="text-xs font-semibold text-slate-500">{when(i.occurredAt)}{i.location ? ` · ${i.location}` : ""} · {i.severity}{canEdit && i.reportedByName ? ` · by ${i.reportedByName}` : ""}</div>
                  <p className="mt-1 text-sm text-slate-600">{i.description}</p>
                </div>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-black capitalize text-slate-600">{i.status.replace("-", " ")}</span>
              </div>
              {canEdit && i.status !== "closed" && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {i.status === "reported" && <button onClick={() => setStatus(i, "under-review")} className="rounded-lg bg-sky-100 px-3 py-1 text-xs font-black text-sky-700">Start review</button>}
                  {level === "admin" && <button onClick={() => setStatus(i, "escalated")} className="rounded-lg bg-amber-100 px-3 py-1 text-xs font-black text-amber-700">Escalate</button>}
                  {level === "admin" && <button onClick={() => setStatus(i, "closed")} className="rounded-lg bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700">Close</button>}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
