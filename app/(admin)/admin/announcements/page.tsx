// Write announcements for everyone, your association or your club. They arrive in members' notifications.

"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Megaphone, Trash2 } from "lucide-react";

type Audience = "global" | "association" | "club";
interface Ann { targeting?: { teamIds?: string[]; maxAge?: number | null; includeGuardians?: boolean }; announcementId: string; level: Audience; scopeId?: string; title: string; body: string; status: string; publishAt: string; expiresAt?: string | null; createdByName?: string }

const inputCls = "w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-teal-400";
const labelCls = "mb-1 block text-xs font-black uppercase tracking-wide text-slate-400";
const AUDIENCE_LABEL: Record<Audience, string> = { global: "Everyone", association: "My association", club: "My club" };
const when = (iso: string) => new Date(iso).toLocaleString("en-AU", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

async function api(url: string, init?: RequestInit) {
  const r = await fetch(url, { credentials: "include", headers: { "Content-Type": "application/json" }, ...init });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || "Something went wrong");
  return d;
}

export default function AnnouncementsPage() {
  const [rows, setRows] = useState<Ann[] | null>(null);
  const [audiences, setAudiences] = useState<Audience[]>([]);
  const [teams, setTeams] = useState<{ teamId: string; name: string }[]>([]);
  const [target, setTarget] = useState<{ teamIds: string[]; maxAge: string; includeGuardians: boolean }>({ teamIds: [], maxAge: "", includeGuardians: true });
  const [defaults, setDefaults] = useState({ clubId: "", associationId: "" });
  const [form, setForm] = useState({ level: "club" as Audience, title: "", body: "", link: "", publishAt: "", expiresAt: "" });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await api("/api/admin/announcements");
      setRows(d.announcements ?? []);
      setAudiences(d.audiences ?? []);
      setTeams(d.teams ?? []);
      setDefaults(d.defaults ?? { clubId: "", associationId: "" });
      if (d.audiences?.length && !d.audiences.includes("club")) setForm((f) => ({ ...f, level: d.audiences[0] }));
    } catch (e) { setRows([]); toast.error(e instanceof Error ? e.message : "Couldn't load"); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const publish = async () => {
    setBusy(true);
    try {
      const scopeId = form.level === "club" ? defaults.clubId : form.level === "association" ? defaults.associationId : "";
      await api("/api/admin/announcements", { method: "POST", body: JSON.stringify({ ...form, scopeId, targeting: form.level === "global" ? undefined : { teamIds: form.level === "club" ? target.teamIds : [], maxAge: target.maxAge ? Number(target.maxAge) : null, includeGuardians: target.includeGuardians }, link: form.link || null, publishAt: form.publishAt || null, expiresAt: form.expiresAt || null }) });
      toast.success("Announcement published");
      setForm({ ...form, title: "", body: "", link: "", publishAt: "", expiresAt: "" });
      setTarget({ teamIds: [], maxAge: "", includeGuardians: true });
      await load();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); } finally { setBusy(false); }
  };

  const setStatus = async (a: Ann, status: "withdrawn" | "published") => {
    try { await api(`/api/admin/announcements/${a.announcementId}`, { method: "PATCH", body: JSON.stringify({ status }) }); await load(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  };
  const remove = async (a: Ann) => {
    try { await api(`/api/admin/announcements/${a.announcementId}`, { method: "DELETE" }); toast.success("Deleted"); await load(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-black text-[#06054e]">Announcements</h1>
        <p className="mt-1 text-sm font-semibold text-slate-500">Write a message for your members. It appears in their notifications (unless they've switched announcements off).</p>
      </div>

      <div className="space-y-4 rounded-2xl border-2 border-slate-100 bg-white p-5 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className={labelCls}>Who it's for</label>
            <select className={inputCls} value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value as Audience })}>
              {audiences.map((a) => <option key={a} value={a}>{AUDIENCE_LABEL[a]}</option>)}
            </select></div>
          <div><label className={labelCls}>Link (optional)</label><input className={inputCls} placeholder="/events or https://…" value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} /></div>
          {form.level !== "global" && (
            <div className="space-y-3 rounded-xl bg-slate-50 p-3 sm:col-span-2">
              <div className="text-xs font-black uppercase tracking-wide text-slate-400">Narrow it down (optional)</div>
              {form.level === "club" && teams.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {teams.map((t) => {
                    const on = target.teamIds.includes(t.teamId);
                    return <button type="button" key={t.teamId} onClick={() => setTarget({ ...target, teamIds: on ? target.teamIds.filter((x) => x !== t.teamId) : [...target.teamIds, t.teamId] })} className={`rounded-lg px-3 py-1 text-xs font-black ${on ? "bg-teal-500 text-white" : "bg-white text-slate-500"}`}>{t.name}</button>;
                  })}
                </div>
              )}
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-600">Aged up to <input type="number" min={4} max={99} className="w-20 rounded-lg border-2 border-slate-200 px-2 py-1" value={target.maxAge} onChange={(e) => setTarget({ ...target, maxAge: e.target.value })} /></label>
                <label className="flex items-center gap-2 text-xs font-bold text-slate-600"><input type="checkbox" checked={target.includeGuardians} onChange={(e) => setTarget({ ...target, includeGuardians: e.target.checked })} /> Also send to parents and guardians</label>
              </div>
              <p className="text-xs font-semibold text-slate-400">{target.teamIds.length || target.maxAge ? "Only people who match get it." : "Leave blank to reach everyone in the audience."}</p>
            </div>
          )}
          <div className="sm:col-span-2"><label className={labelCls}>Headline</label><input className={inputCls} maxLength={120} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div className="sm:col-span-2"><label className={labelCls}>Message</label><textarea className={inputCls} rows={4} maxLength={2000} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></div>
          <div><label className={labelCls}>Publish at (blank = now)</label><input type="datetime-local" className={inputCls} value={form.publishAt} onChange={(e) => setForm({ ...form, publishAt: e.target.value })} /></div>
          <div><label className={labelCls}>Remove after (blank = 14 days)</label><input type="datetime-local" className={inputCls} value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} /></div>
        </div>
        <button onClick={publish} disabled={busy || audiences.length === 0} className="inline-flex items-center gap-2 rounded-xl bg-teal-500 px-4 py-2 text-sm font-black text-white disabled:opacity-50">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Megaphone className="h-4 w-4" />} Publish
        </button>
      </div>

      {rows === null ? <Loader2 className="h-6 w-6 animate-spin text-slate-400" /> : rows.length === 0 ? (
        <p className="rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center text-sm font-semibold text-slate-400">No announcements yet.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((a) => (
            <li key={a.announcementId} className="rounded-2xl border-2 border-slate-100 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-black text-slate-800">{a.title}</div>
                  <div className="text-xs font-semibold text-slate-500">{AUDIENCE_LABEL[a.level]} · {Date.parse(a.publishAt) > Date.now() ? `goes out ${when(a.publishAt)}` : `sent ${when(a.publishAt)}`}{a.createdByName ? ` · ${a.createdByName}` : ""}{a.targeting?.teamIds?.length ? ` · ${a.targeting.teamIds.length} team${a.targeting.teamIds.length === 1 ? "" : "s"}` : ""}{a.targeting?.maxAge ? ` · up to age ${a.targeting.maxAge}` : ""}</div>
                  <p className="mt-1 text-sm text-slate-600">{a.body}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-1 text-xs font-black capitalize ${a.status === "published" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{a.status}</span>
                  <button onClick={() => remove(a)} aria-label="Delete announcement" className="text-slate-300 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
              <button onClick={() => setStatus(a, a.status === "published" ? "withdrawn" : "published")} className="mt-3 rounded-lg bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                {a.status === "published" ? "Withdraw" : "Publish again"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
