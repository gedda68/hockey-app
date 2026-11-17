// Injury register and return to play.

"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";

import PageHeader from "@/components/admin/PageHeader";
interface Injury { injuryId: string; memberId: string; memberName: string; occurredAt: string; bodyPart: string; description?: string; severity: string; status: "active" | "recovering" | "cleared"; expectedReturn: string | null; history: { at: string; by: string; status?: string; note?: string }[] }

const inputCls = "w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-teal-400";
const labelCls = "mb-1 block text-xs font-black uppercase tracking-wide text-slate-400";
const dateOf = (iso: string) => new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
const TONE: Record<string, string> = { active: "bg-red-100 text-red-700", recovering: "bg-amber-100 text-amber-700", cleared: "bg-emerald-100 text-emerald-700" };

async function api(url: string, init?: RequestInit) {
  const r = await fetch(url, { credentials: "include", headers: { "Content-Type": "application/json" }, ...init });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || "Something went wrong");
  return d;
}

export default function InjuriesPage() {
  const [rows, setRows] = useState<Injury[] | null>(null);
  const [level, setLevel] = useState("own");
  const [q, setQ] = useState("");
  const [found, setFound] = useState<{ memberId: string; name: string }[]>([]);
  const [who, setWho] = useState<{ memberId: string; name: string } | null>(null);
  const [form, setForm] = useState({ occurredAt: "", bodyPart: "", severity: "minor", description: "", expectedReturn: "" });
  const [busy, setBusy] = useState(false);
  const canEdit = level === "edit" || level === "admin";

  const load = useCallback(async () => {
    try { const d = await api("/api/records/injuries"); setRows(d.injuries ?? []); setLevel(d.level ?? "own"); }
    catch (e) { setRows([]); toast.error(e instanceof Error ? e.message : "Couldn't load"); }
  }, []);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!canEdit || q.trim().length < 2) { setFound([]); return () => undefined; }
    const t = setTimeout(() => api(`/api/records/injuries?people=${encodeURIComponent(q)}`).then((d) => setFound(d.people ?? [])).catch(() => setFound([])), 250);
    return () => clearTimeout(t);
  }, [q, canEdit]);

  const add = async () => {
    if (!who) { toast.error("Choose who was injured"); return; }
    setBusy(true);
    try {
      await api("/api/records/injuries", { method: "POST", body: JSON.stringify({ ...form, memberId: who.memberId, expectedReturn: form.expectedReturn || null }) });
      toast.success("Injury recorded");
      setWho(null); setQ(""); setForm({ occurredAt: "", bodyPart: "", severity: "minor", description: "", expectedReturn: "" });
      await load();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); } finally { setBusy(false); }
  };

  const update = async (i: Injury, status: Injury["status"]) => {
    try { await api(`/api/records/injuries/${i.injuryId}`, { method: "PATCH", body: JSON.stringify({ status }) }); await load(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <PageHeader eyebrow="Welfare" title="Injuries" subtitle={canEdit ? "Record injuries and track return to play." : "Injuries recorded for you and your children."} />

      {canEdit && (
        <div className="space-y-4 rounded-2xl border-2 border-slate-100 bg-white p-5 shadow-sm">
          <div>
            <label className={labelCls}>Who</label>
            {who ? <div className="flex items-center gap-2 text-sm font-black text-slate-800">{who.name}<button className="text-xs text-teal-600" onClick={() => setWho(null)}>change</button></div> : (
              <>
                <input className={inputCls} placeholder="Search by name" value={q} onChange={(e) => setQ(e.target.value)} />
                {found.length > 0 && <ul className="mt-1 rounded-xl border border-slate-200 bg-white">{found.map((p) => <li key={p.memberId}><button className="w-full px-3 py-2 text-left text-sm font-semibold hover:bg-slate-50" onClick={() => setWho(p)}>{p.name}</button></li>)}</ul>}
              </>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className={labelCls}>When</label><input type="datetime-local" className={inputCls} value={form.occurredAt} onChange={(e) => setForm({ ...form, occurredAt: e.target.value })} /></div>
            <div><label className={labelCls}>Body part</label><input className={inputCls} value={form.bodyPart} onChange={(e) => setForm({ ...form, bodyPart: e.target.value })} /></div>
            <div><label className={labelCls}>Severity</label>
              <select className={inputCls} value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}><option value="minor">Minor</option><option value="moderate">Moderate</option><option value="serious">Serious</option></select></div>
            <div><label className={labelCls}>Expected back</label><input type="date" className={inputCls} value={form.expectedReturn} onChange={(e) => setForm({ ...form, expectedReturn: e.target.value })} /></div>
            <div className="sm:col-span-2"><label className={labelCls}>What happened</label><textarea className={inputCls} rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          </div>
          <button onClick={add} disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-teal-500 px-4 py-2 text-sm font-black text-white disabled:opacity-50">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Record injury
          </button>
        </div>
      )}

      {rows === null ? <Loader2 className="h-6 w-6 animate-spin text-slate-400" /> : rows.length === 0 ? (
        <p className="rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center text-sm font-semibold text-slate-400">No injuries recorded.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((i) => (
            <li key={i.injuryId} className="rounded-2xl border-2 border-slate-100 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-black text-slate-800">{i.memberName} — {i.bodyPart}</div>
                  <div className="text-xs font-semibold text-slate-500">{dateOf(i.occurredAt)} · {i.severity}{i.expectedReturn ? ` · back about ${dateOf(i.expectedReturn)}` : ""}</div>
                  {i.description && <p className="mt-1 text-sm text-slate-600">{i.description}</p>}
                </div>
                <span className={`rounded-full px-2 py-1 text-xs font-black capitalize ${TONE[i.status]}`}>{i.status}</span>
              </div>
              {canEdit && i.status !== "cleared" && (
                <div className="mt-3 flex gap-2">
                  {i.status === "active" && <button onClick={() => update(i, "recovering")} className="rounded-lg bg-amber-100 px-3 py-1 text-xs font-black text-amber-700">Mark recovering</button>}
                  <button onClick={() => update(i, "cleared")} className="rounded-lg bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700">Cleared to play</button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
