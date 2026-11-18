"use client";

// Volunteer roster: create canteen, scoring and ground set-up shifts, see who's on, fill gaps.

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import { KINDS, KIND_LABELS, timeRange, type ShiftKind } from "@/lib/volunteers/logic";

interface Person { signupId: string; memberId: string; name: string; status: string }
interface Shift { shiftId: string; kind: ShiftKind; label: string; date: string; startTime: string; endTime: string; slots: number; location?: string; notes?: string; status: string; people: Person[]; filled: number; free: number; needCover: number; full: boolean }

const inputCls = "w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-teal-400";
const labelCls = "mb-1 block text-xs font-black uppercase tracking-wide text-slate-500";
const dayText = (d: string) => new Date(`${d}T00:00:00+10:00`).toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", timeZone: "Australia/Brisbane" });
const blank = { kind: "canteen" as ShiftKind, label: "", date: "", startTime: "08:00", endTime: "12:00", slots: "2", location: "", notes: "", repeatWeeks: "0" };

async function call(url: string, method: string, body?: unknown) {
  const r = await fetch(url, { method, credentials: "include", headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || "Failed");
  return d;
}

function AddPerson({ shiftId, clubId, onDone }: { shiftId: string; clubId: string; onDone: () => void }) {
  const [q, setQ] = useState("");
  const [found, setFound] = useState<{ memberId: string; name: string }[]>([]);
  useEffect(() => {
    if (q.trim().length < 2) { setFound([]); return; }
    const t = setTimeout(() => call(`/api/admin/volunteer-shifts/members?clubId=${encodeURIComponent(clubId)}&q=${encodeURIComponent(q)}`, "GET").then((d) => setFound(d.members)).catch(() => setFound([])), 300);
    return () => clearTimeout(t);
  }, [q, clubId]);
  return (
    <div className="relative">
      <input className={inputCls} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Put someone on this shift: type a name" />
      {found.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border-2 border-slate-200 bg-white shadow-lg">
          {found.map((m) => <li key={m.memberId}><button type="button" className="w-full px-3 py-2 text-left text-sm font-semibold hover:bg-teal-50" onClick={async () => { try { await call(`/api/admin/volunteer-shifts/${shiftId}`, "POST", { action: "assign", memberId: m.memberId }); toast.success(`${m.name} added`); setQ(""); setFound([]); onDone(); } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); } }}>{m.name}</button></li>)}
        </ul>
      )}
    </div>
  );
}

export default function VolunteerShiftsPage() {
  const [data, setData] = useState<{ club: { id: string; name: string }; today: string; shifts: Shift[] } | null>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState(blank);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try { setData(await call("/api/admin/volunteer-shifts", "GET")); } catch (e) { setError(e instanceof Error ? e.message : "Couldn't load"); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const create = async () => {
    setBusy(true);
    try {
      const d = await call("/api/admin/volunteer-shifts", "POST", { ...form, slots: Number(form.slots), repeatWeeks: Number(form.repeatWeeks) });
      toast.success(d.created > 1 ? `${d.created} weekly shifts created` : "Shift created");
      setShowForm(false); setForm({ ...blank, kind: form.kind });
      await load();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); } finally { setBusy(false); }
  };
  const act = async (fn: () => Promise<unknown>, ok: string) => { try { await fn(); toast.success(ok); await load(); } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); } };

  const upcoming = (data?.shifts ?? []).filter((s) => s.status === "open");
  const gaps = upcoming.filter((s) => s.date >= (data?.today ?? "") && (s.free > 0 || s.needCover > 0));
  const groups = upcoming.reduce<Record<string, Shift[]>>((g, s) => ((g[s.date] ??= []).push(s), g), {});

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
      <PageHeader eyebrow="Volunteering" title="Volunteer shifts" subtitle={data ? `${data.club.name}: canteen, scoring and ground set-up. Volunteers sign up themselves and get reminders.` : "Canteen, scoring and ground set-up."}
        aside={data && <button type="button" onClick={() => setShowForm((s) => !s)} className="inline-flex items-center gap-2 rounded-xl bg-white/95 px-4 py-2 text-sm font-black text-[#06054e] shadow"><Plus size={16} /> New shift</button>} />
      {error && <p className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}

      {showForm && (
        <section className="space-y-4 rounded-2xl border-2 border-teal-200 bg-white p-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <div><label className={labelCls}>Job</label><select className={inputCls} value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as ShiftKind })}>{KINDS.map((k) => <option key={k} value={k}>{KIND_LABELS[k]}</option>)}</select></div>
            {form.kind === "other" && <div className="sm:col-span-2"><label className={labelCls}>Name of the job</label><input className={inputCls} maxLength={80} value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="e.g. BBQ" /></div>}
            <div><label className={labelCls}>Date</label><input type="date" className={inputCls} min={data?.today} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
            <div><label className={labelCls}>Starts</label><input type="time" className={inputCls} value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} /></div>
            <div><label className={labelCls}>Ends</label><input type="time" className={inputCls} value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} /></div>
            <div><label className={labelCls}>People needed</label><input type="number" min={1} max={30} className={inputCls} value={form.slots} onChange={(e) => setForm({ ...form, slots: e.target.value })} /></div>
            <div><label className={labelCls}>Repeat every week for</label><select className={inputCls} value={form.repeatWeeks} onChange={(e) => setForm({ ...form, repeatWeeks: e.target.value })}>{[0, 1, 2, 3, 5, 7, 11, 15, 19, 25].map((n) => <option key={n} value={n}>{n === 0 ? "Just this once" : `${n + 1} weeks in total`}</option>)}</select></div>
            <div className="sm:col-span-3"><label className={labelCls}>Where</label><input className={inputCls} maxLength={120} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g. Canteen, main pitch" /></div>
            <div className="sm:col-span-3"><label className={labelCls}>Notes for volunteers (optional)</label><input className={inputCls} maxLength={400} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="e.g. Keys from the clubhouse. Float is in the safe." /></div>
          </div>
          <button type="button" disabled={busy || !form.date} onClick={create} className="inline-flex items-center gap-2 rounded-xl bg-[#06054e] px-6 py-3 text-sm font-black text-white disabled:opacity-50">{busy && <Loader2 className="animate-spin" size={16} />} Create</button>
        </section>
      )}

      {!data && !error ? <div className="flex justify-center py-12"><Loader2 className="animate-spin text-slate-400" /></div> : data && (
        <>
          {gaps.length > 0 && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900">{gaps.length} upcoming {gaps.length === 1 ? "shift needs" : "shifts need"} people: {gaps.reduce((n, s) => n + s.free, 0)} places free{gaps.some((s) => s.needCover) ? `, ${gaps.reduce((n, s) => n + s.needCover, 0)} asking for cover` : ""}.</p>}
          {upcoming.length === 0 ? <p className="rounded-2xl bg-slate-50 p-8 text-center text-sm font-semibold text-slate-600">No shifts yet. Create one, or repeat it weekly for the season.</p> : Object.entries(groups).map(([date, list]) => (
            <section key={date} className="space-y-2">
              <h2 className="text-sm font-black text-[#06054e]">{dayText(date)}{date < data.today ? " (past)" : ""}</h2>
              {list.map((s) => (
                <div key={s.shiftId} className="space-y-3 rounded-2xl border-2 border-slate-100 bg-white p-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-black text-slate-800">{s.label}: {timeRange(s)}</p>
                      <p className="text-xs font-semibold text-slate-500">{[s.location, s.notes].filter(Boolean).join(" · ")}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-black ${s.full ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>{s.filled} / {s.slots}{s.needCover ? ` · ${s.needCover} need cover` : ""}</span>
                    <button type="button" title="Cancel this shift" onClick={() => window.confirm("Cancel this shift? Its volunteers will no longer be on it.") && act(() => call(`/api/admin/volunteer-shifts/${s.shiftId}`, "DELETE"), "Shift cancelled")} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={16} /></button>
                  </div>
                  {s.people.length > 0 && (
                    <ul className="flex flex-wrap gap-2">
                      {s.people.map((p) => (
                        <li key={p.signupId} className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold ${p.status === "swap_requested" ? "bg-amber-100 text-amber-800" : "bg-teal-50 text-teal-800"}`}>
                          {p.name}{p.status === "swap_requested" ? " (needs cover)" : ""}
                          <button type="button" aria-label={`Remove ${p.name}`} className="text-slate-400 hover:text-red-600" onClick={() => act(() => call(`/api/admin/volunteer-shifts/${s.shiftId}`, "POST", { action: "remove", signupId: p.signupId }), `${p.name} removed`)}>×</button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {!s.full && date >= data.today && <AddPerson shiftId={s.shiftId} clubId={data.club.id} onDone={load} />}
                </div>
              ))}
            </section>
          ))}
        </>
      )}
    </div>
  );
}
