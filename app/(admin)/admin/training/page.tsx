// Training sessions and attendance.

"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";

type Att = "present" | "absent" | "excused" | "late";
interface Row { memberId: string; status: Att; note?: string }
interface Session { sessionId: string; title: string; teamId: string | null; startAt: string; location?: string; focus?: string; status: string; attendance: Row[] }
interface Player { memberId: string; name: string }

const inputCls = "w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-teal-400";
const labelCls = "mb-1 block text-xs font-black uppercase tracking-wide text-slate-400";
const when = (iso: string) => new Date(iso).toLocaleString("en-AU", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
const STATUSES: Att[] = ["present", "late", "excused", "absent"];

async function api(url: string, init?: RequestInit) {
  const r = await fetch(url, { credentials: "include", headers: { "Content-Type": "application/json" }, ...init });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || "Something went wrong");
  return d;
}

export default function TrainingPage() {
  const [sessions, setSessions] = useState<Session[] | null>(null);
  const [level, setLevel] = useState("own");
  const [teams, setTeams] = useState<{ teamId: string; name: string }[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [roster, setRoster] = useState<Player[]>([]);
  const [marks, setMarks] = useState<Record<string, Att>>({});
  const [form, setForm] = useState({ title: "", startAt: "", endAt: "", teamId: "", location: "", focus: "" });
  const [busy, setBusy] = useState(false);
  const canEdit = level === "edit" || level === "admin";

  const load = useCallback(async () => {
    try {
      const d = await api("/api/records/training");
      setSessions(d.sessions ?? []);
      setLevel(d.level ?? "own");
      if (d.level === "edit" || d.level === "admin") setTeams((await api("/api/records/training?teams=1")).teams ?? []);
    } catch (e) {
      setSessions([]);
      toast.error(e instanceof Error ? e.message : "Couldn't load");
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const create = async () => {
    setBusy(true);
    try {
      await api("/api/records/training", { method: "POST", body: JSON.stringify({ ...form, teamId: form.teamId || null, endAt: form.endAt || null }) });
      toast.success("Session scheduled");
      setForm({ title: "", startAt: "", endAt: "", teamId: "", location: "", focus: "" });
      await load();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); } finally { setBusy(false); }
  };

  const openSession = async (s: Session) => {
    if (open === s.sessionId) return setOpen(null);
    setOpen(s.sessionId);
    setMarks(Object.fromEntries(s.attendance.map((a) => [a.memberId, a.status])));
    setRoster([]);
    if (canEdit && s.teamId) setRoster((await api(`/api/records/training?roster=${encodeURIComponent(s.teamId)}`).catch(() => ({ players: [] }))).players ?? []);
  };

  const saveAttendance = async (s: Session) => {
    try {
      await api(`/api/records/training/${s.sessionId}`, { method: "PATCH", body: JSON.stringify({ status: "completed", attendance: Object.entries(marks).map(([memberId, status]) => ({ memberId, status })) }) });
      toast.success("Attendance saved");
      await load();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  };

  const remove = async (s: Session) => {
    try { await api(`/api/records/training/${s.sessionId}`, { method: "DELETE" }); toast.success("Deleted"); await load(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-black text-[#06054e]">Training</h1>
        <p className="mt-1 text-sm font-semibold text-slate-500">{canEdit ? "Schedule sessions and take attendance." : "Sessions you've been marked in."}</p>
      </div>

      {canEdit && (
        <div className="space-y-4 rounded-2xl border-2 border-slate-100 bg-white p-5 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2"><label className={labelCls}>Title</label><input className={inputCls} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div><label className={labelCls}>Starts</label><input type="datetime-local" className={inputCls} value={form.startAt} onChange={(e) => setForm({ ...form, startAt: e.target.value })} /></div>
            <div><label className={labelCls}>Ends</label><input type="datetime-local" className={inputCls} value={form.endAt} onChange={(e) => setForm({ ...form, endAt: e.target.value })} /></div>
            <div><label className={labelCls}>Team</label>
              <select className={inputCls} value={form.teamId} onChange={(e) => setForm({ ...form, teamId: e.target.value })}>
                <option value="">Whole club</option>{teams.map((t) => <option key={t.teamId} value={t.teamId}>{t.name}</option>)}
              </select></div>
            <div><label className={labelCls}>Location</label><input className={inputCls} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
            <div className="sm:col-span-2"><label className={labelCls}>Focus</label><input className={inputCls} value={form.focus} onChange={(e) => setForm({ ...form, focus: e.target.value })} /></div>
          </div>
          <button onClick={create} disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-teal-500 px-4 py-2 text-sm font-black text-white disabled:opacity-50">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Schedule
          </button>
        </div>
      )}

      {sessions === null ? <Loader2 className="h-6 w-6 animate-spin text-slate-400" /> : sessions.length === 0 ? (
        <p className="rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center text-sm font-semibold text-slate-400">No training sessions yet.</p>
      ) : (
        <ul className="space-y-3">
          {sessions.map((s) => (
            <li key={s.sessionId} className="rounded-2xl border-2 border-slate-100 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <button onClick={() => openSession(s)} className="text-left">
                  <div className="font-black text-slate-800">{s.title}</div>
                  <div className="text-xs font-semibold text-slate-500">{when(s.startAt)} · {teams.find((t) => t.teamId === s.teamId)?.name ?? (s.teamId ? "Team" : "Whole club")}{s.location ? ` · ${s.location}` : ""} · {s.status}</div>
                  {canEdit && <div className="mt-1 text-xs font-black text-teal-600">{open === s.sessionId ? "Hide attendance" : "Take attendance ▸"}</div>}
                </button>
                {level === "admin" && <button onClick={() => remove(s)} aria-label="Delete session" className="text-slate-300 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>}
              </div>
              {!canEdit && s.attendance[0] && <div className="mt-2 text-xs font-black uppercase text-teal-600">You: {s.attendance[0].status}</div>}
              {open === s.sessionId && canEdit && (
                <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
                  {s.focus && <p className="text-sm text-slate-600">{s.focus}</p>}
                  {roster.length === 0 ? <p className="text-sm font-semibold text-slate-400">{s.teamId ? "No players on this team." : "Attendance is taken for team sessions."}</p> : roster.map((p) => (
                    <div key={p.memberId} className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-slate-700">{p.name}</span>
                      <div className="flex gap-1">
                        {STATUSES.map((st) => (
                          <button key={st} onClick={() => setMarks({ ...marks, [p.memberId]: st })} className={`rounded-lg px-2 py-1 text-xs font-black capitalize ${marks[p.memberId] === st ? "bg-teal-500 text-white" : "bg-slate-100 text-slate-500"}`}>{st}</button>
                        ))}
                      </div>
                    </div>
                  ))}
                  {roster.length > 0 && <button onClick={() => saveAttendance(s)} className="mt-2 rounded-xl bg-[#06054e] px-4 py-2 text-sm font-black text-white">Save attendance</button>}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
