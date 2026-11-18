"use client";

// Ask a squad "can you play on <date>?" and see how many have said yes.

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";

interface Team { teamId: string; clubId: string; name: string }
interface Fixture { fixtureId: string; teamId: string; opponent: string; round: number | null; startsAt: string; matchDate: string; venue: string }
interface Row { requestId: string; title: string; teamName: string; matchDate: string; startsAt?: string; status: string; squadSize: number | null; invited: number; counts: { in: number; maybe: number; out: number; none: number } }

const inputCls = "w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-teal-400";
const labelCls = "mb-1 block text-xs font-black uppercase tracking-wide text-slate-500";
const fmtDay = (d: string) => new Date(`${d}T00:00:00+10:00`).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short", timeZone: "Australia/Brisbane" });

export default function TeamAvailabilityPage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [opts, setOpts] = useState<{ teams: Team[]; fixtures: Fixture[]; today: string } | null>(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ teamId: "", fixtureId: "", title: "", matchDate: "", time: "", venue: "", squadSize: "", note: "" });

  const load = useCallback(async () => {
    try {
      const [a, b] = await Promise.all([fetch("/api/admin/rsvp", { credentials: "include" }), fetch("/api/admin/rsvp/options", { credentials: "include" })]);
      const da = await a.json().catch(() => ({})), db = await b.json().catch(() => ({}));
      if (!a.ok) throw new Error(da.error || "Couldn't load");
      setRows(da.requests ?? []); setOpts(db);
      if (db.teams?.length === 1) setF((x) => ({ ...x, teamId: db.teams[0].teamId }));
    } catch (e) { setError(e instanceof Error ? e.message : "Couldn't load"); setRows([]); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const fixtures = useMemo(() => (opts?.fixtures ?? []).filter((x) => x.teamId === f.teamId), [opts, f.teamId]);

  const pickFixture = (id: string) => {
    const fx = fixtures.find((x) => x.fixtureId === id);
    if (!fx) { setF((x) => ({ ...x, fixtureId: "" })); return; }
    const t = new Date(fx.startsAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Australia/Brisbane" });
    setF((x) => ({ ...x, fixtureId: id, title: `${fx.round ? `Round ${fx.round} ` : ""}${fx.opponent ? `v ${fx.opponent}` : "match"}`.trim(), matchDate: fx.matchDate, time: t, venue: fx.venue }));
  };

  const send = async () => {
    setBusy(true);
    try {
      const startsAt = f.matchDate && f.time ? new Date(`${f.matchDate}T${f.time}:00+10:00`).toISOString() : undefined;
      const r = await fetch("/api/admin/rsvp", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ teamId: f.teamId, title: f.title, matchDate: f.matchDate, startsAt, venue: f.venue, fixtureId: f.fixtureId, squadSize: f.squadSize, note: f.note }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "Couldn't send");
      toast.success(d.warning ?? `Asked ${d.invited} ${d.invited === 1 ? "player" : "players"}${d.emailed ? `, ${d.emailed} emailed` : ""}`);
      setOpen(false); setF((x) => ({ ...x, fixtureId: "", title: "", matchDate: "", time: "", venue: "", squadSize: "", note: "" }));
      await load();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't send"); } finally { setBusy(false); }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
      <PageHeader eyebrow="Teams" title="Squad availability" subtitle="Ask your squad who can play. One tap to answer, and anyone who hasn't gets a reminder."
        aside={opts && <button type="button" onClick={() => setOpen((o) => !o)} className="inline-flex items-center gap-2 rounded-xl bg-white/95 px-4 py-2 text-sm font-black text-[#06054e] shadow"><Plus size={16} /> Ask the squad</button>} />
      {error && <p className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}

      {open && opts && (
        <section className="space-y-4 rounded-2xl border-2 border-teal-200 bg-white p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Team</label>
              <select className={inputCls} value={f.teamId} onChange={(e) => setF({ ...f, teamId: e.target.value, fixtureId: "" })}>
                <option value="">Choose a team…</option>
                {opts.teams.map((t) => <option key={t.teamId} value={t.teamId}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Match (or fill in your own below)</label>
              <select className={inputCls} value={f.fixtureId} disabled={!f.teamId} onChange={(e) => pickFixture(e.target.value)}>
                <option value="">Another date…</option>
                {fixtures.map((x) => <option key={x.fixtureId} value={x.fixtureId}>{fmtDay(x.matchDate)}: {x.opponent ? `v ${x.opponent}` : "match"}{x.round ? ` (R${x.round})` : ""}</option>)}
              </select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-3"><label className={labelCls}>Title</label><input className={inputCls} maxLength={120} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="e.g. Round 5 v Brothers" /></div>
            <div><label className={labelCls}>Date</label><input type="date" className={inputCls} min={opts.today} value={f.matchDate} onChange={(e) => setF({ ...f, matchDate: e.target.value })} /></div>
            <div><label className={labelCls}>Start time (optional)</label><input type="time" className={inputCls} value={f.time} onChange={(e) => setF({ ...f, time: e.target.value })} /></div>
            <div><label className={labelCls}>Players needed (optional)</label><input type="number" min={1} max={60} className={inputCls} value={f.squadSize} onChange={(e) => setF({ ...f, squadSize: e.target.value })} placeholder="e.g. 16" /></div>
            <div className="sm:col-span-2"><label className={labelCls}>Where</label><input className={inputCls} maxLength={120} value={f.venue} onChange={(e) => setF({ ...f, venue: e.target.value })} /></div>
            <div className="sm:col-span-3"><label className={labelCls}>Message to the squad (optional)</label><input className={inputCls} maxLength={300} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="e.g. Please answer by Thursday night" /></div>
          </div>
          <p className="text-xs font-semibold text-slate-500">Players get a notification in the app and an email with a one-tap link. Parents are asked for juniors. Anyone who hasn't answered gets a reminder a day later, and again about a day and a half before the match. Nobody is messaged overnight.</p>
          <button type="button" disabled={busy || !f.teamId || !f.title || !f.matchDate} onClick={send} className="inline-flex items-center gap-2 rounded-xl bg-[#06054e] px-6 py-3 text-sm font-black text-white disabled:opacity-50">{busy && <Loader2 className="animate-spin" size={16} />} Send to the squad</button>
        </section>
      )}

      {rows === null ? <div className="flex justify-center py-12"><Loader2 className="animate-spin text-slate-400" /></div> : rows.length === 0 && !error ? (
        <p className="rounded-2xl bg-slate-50 p-8 text-center text-sm font-semibold text-slate-600">No requests yet. Choose "Ask the squad" to find out who can play your next match.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.requestId}>
              <Link href={`/admin/team-availability/${r.requestId}`} className="flex flex-wrap items-center gap-3 rounded-2xl border-2 border-slate-100 bg-white p-4 transition hover:border-teal-300">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-black text-slate-800">{r.title}</p>
                  <p className="text-xs font-semibold text-slate-500">{r.teamName} · {fmtDay(r.matchDate)}{r.status === "closed" ? " · Closed" : ""}</p>
                </div>
                <p className="text-sm font-black text-slate-700">
                  <span className="text-emerald-700">{r.counts.in} in</span>{r.squadSize ? ` of ${r.squadSize}` : ""} · <span className="text-amber-700">{r.counts.maybe} maybe</span> · <span className="text-red-700">{r.counts.out} out</span> · <span className="text-slate-500">{r.counts.none} to reply</span>
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
