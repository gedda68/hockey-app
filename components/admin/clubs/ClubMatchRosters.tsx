"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Lock, LockOpen, Search, Star, Users } from "lucide-react";

interface Win { open: boolean; closesAt: string | null; requiresReason: boolean; reason: string | null }
interface Match {
  fixtureId: string; seasonCompetitionId: string; competition: string; round: number | null;
  teamId: string; teamName: string; opponent: string; home: boolean;
  scheduledStart: string | null; venueName: string | null; status: string; named: number; window: Win;
}
interface Player { memberId: string; name: string; status: string | null }
interface LP { memberId: string; shirtNumber: number | null; isGoalkeeper: boolean; isCaptain: boolean; started: boolean; minuteEntered: number | null; didNotPlay: boolean }
interface Payload { club: { id: string; name: string }; matches: Match[]; players: Player[] }

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "No date");

function countdown(closesAt: string | null, now: number): string | null {
  if (!closesAt) return null;
  const ms = Date.parse(closesAt) - now;
  if (ms <= 0) return null;
  const m = Math.floor(ms / 60_000);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h ${m % 60}m`;
  return `${Math.floor(h / 24)} days`;
}

export default function ClubMatchRosters({ clubRef }: { clubRef: string }) {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/admin/clubs/${encodeURIComponent(clubRef)}/match-rosters`);
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Failed to load");
      setData(j);
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
  }, [clubRef]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(t); }, []);

  if (error) return <p role="alert" className="text-sm font-semibold text-red-600">{error}</p>;
  if (!data) return <div className="h-64 animate-pulse rounded-2xl bg-slate-200/70" />;

  const isOpen = (m: Match) => m.window.open && (!m.window.closesAt || Date.parse(m.window.closesAt) >= now) && m.status !== "completed";
  const key = (m: Match) => `${m.fixtureId}|${m.teamId}`;
  const open = data.matches.find((m) => key(m) === openKey) ?? null;
  const upcoming = data.matches.filter(isOpen);
  const locked = data.matches.filter((m) => !isOpen(m));

  const Card = (m: Match) => {
    const left = countdown(m.window.closesAt, now);
    const o = isOpen(m);
    return (
      <li key={key(m)}>
        <button onClick={() => setOpenKey(key(m))}
          className={`flex w-full flex-col gap-1 rounded-2xl border bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:flex-row sm:items-center sm:justify-between ${openKey === key(m) ? "border-[#06054e]" : "border-slate-200"}`}>
          <span className="min-w-0">
            <span className="block text-[11px] font-extrabold uppercase tracking-wide text-slate-400">{m.competition}{m.round ? ` · Round ${m.round}` : ""}</span>
            <span className="block truncate font-black text-[#06054e]">{m.teamName} <span className="font-normal text-slate-400">{m.home ? "v" : "@"}</span> {m.opponent}</span>
            <span className="block text-xs text-slate-500">{fmt(m.scheduledStart)}{m.venueName ? ` · ${m.venueName}` : ""}</span>
          </span>
          <span className="flex items-center gap-3 text-xs font-bold">
            <span className="inline-flex items-center gap-1 text-slate-500"><Users size={13} /> {m.named} named</span>
            {o ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700"><LockOpen size={12} /> {left ? `Locks in ${left}` : "Open"}</span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-slate-600"><Lock size={12} /> Locked</span>
            )}
          </span>
        </button>
      </li>
    );
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,26rem)_1fr]">
      <div className="space-y-5">
        <section>
          <h2 className="mb-2 text-sm font-black uppercase tracking-wide text-[#06054e]">Open for changes ({upcoming.length})</h2>
          <ul className="space-y-3">{upcoming.map(Card)}</ul>
          {upcoming.length === 0 && <p className="rounded-xl border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500">No upcoming matches.</p>}
        </section>
        {locked.length > 0 && (
          <section>
            <h2 className="mb-2 text-sm font-black uppercase tracking-wide text-slate-500">Locked ({locked.length})</h2>
            <ul className="space-y-3">{locked.map(Card)}</ul>
          </section>
        )}
        <p className="text-xs text-slate-500">Your club can only manage its own teams. Rosters lock 5 minutes before the scheduled start.</p>
      </div>

      <div>
        {open ? (
          <Editor key={key(open)} match={open} players={data.players} now={now} onSaved={load} />
        ) : (
          <p className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">Select a match to set its roster.</p>
        )}
      </div>
    </div>
  );
}

function Editor({ match: m, players, now, onSaved }: { match: Match; players: Player[]; now: number; onSaved: () => Promise<void> }) {
  const url = `/api/admin/season-competitions/${encodeURIComponent(m.seasonCompetitionId)}/fixtures/${encodeURIComponent(m.fixtureId)}/lineups/${encodeURIComponent(m.teamId)}`;
  const [sel, setSel] = useState<Map<string, LP> | null>(null);
  const [win, setWin] = useState<Win>(m.window);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    let live = true;
    fetch(url).then((r) => r.json()).then((j) => {
      if (!live) return;
      setWin(j.window ?? m.window);
      setSel(new Map(((j.lineup?.players ?? []) as LP[]).map((p) => [p.memberId, p])));
    }).catch(() => live && setMsg({ ok: false, text: "Could not load roster" }));
    return () => { live = false; };
  }, [url, m.window]);

  const closed = !win.open || (win.closesAt ? Date.parse(win.closesAt) < now : false);
  const shown = useMemo(() => {
    const n = q.trim().toLowerCase();
    const named = sel ?? new Map<string, LP>();
    const ids = new Set(players.map((p) => p.memberId));
    // Anyone already named stays visible even if no longer in the club list.
    const extra = [...named.keys()].filter((id) => !ids.has(id)).map((id) => ({ memberId: id, name: id, status: null }));
    return [...players, ...extra].filter((p) => !n || p.name.toLowerCase().includes(n))
      .sort((a, b) => Number(named.has(b.memberId)) - Number(named.has(a.memberId)) || a.name.localeCompare(b.name));
  }, [players, sel, q]);

  if (!sel) return <div className="h-48 animate-pulse rounded-2xl bg-slate-200/70" />;

  const toggle = (id: string) => setSel((s) => {
    const n = new Map(s); if (n.has(id)) n.delete(id);
    else n.set(id, { memberId: id, shirtNumber: null, isGoalkeeper: false, isCaptain: false, started: false, minuteEntered: null, didNotPlay: false });
    return n;
  });
  const patch = (id: string, p: Partial<LP>) => setSel((s) => { const n = new Map(s); const c = n.get(id); if (c) n.set(id, { ...c, ...p }); return n; });

  const save = async () => {
    setBusy(true); setMsg(null);
    const r = await fetch(url, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ players: [...sel.values()], staff: [] }) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (r.ok) { setWin(j.window ?? win); setMsg({ ok: true, text: "Roster saved." }); await onSaved(); }
    else setMsg({ ok: false, text: j.error ?? "Save failed" });
  };
  const left = countdown(win.closesAt, now);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 p-4">
        <h2 className="text-lg font-black text-[#06054e]">{m.teamName} {m.home ? "v" : "@"} {m.opponent}</h2>
        <p className="text-xs text-slate-500">{m.competition}{m.round ? ` · Round ${m.round}` : ""} · {fmt(m.scheduledStart)}</p>
        <p className={`mt-3 flex items-start gap-2 rounded-xl px-3 py-2 text-xs font-semibold ${closed ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
          {closed ? <Lock size={14} className="mt-0.5 shrink-0" /> : <LockOpen size={14} className="mt-0.5 shrink-0" />}
          {closed
            ? (win.reason ?? "Rosters lock 5 minutes before the scheduled start.") + " Contact your association to request a change."
            : left ? `You can change this roster for ${left} (until ${fmt(win.closesAt)}).` : "Roster is open for changes."}
        </p>
      </div>

      <div className="flex items-center justify-between gap-2 border-b border-slate-100 p-3">
        <div className="relative w-full sm:w-64">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search players…" aria-label="Search players"
            className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-sm focus:border-[#06054e] focus:outline-none focus:ring-2 focus:ring-[#06054e]/20" />
        </div>
        <span className="shrink-0 text-sm font-bold text-[#06054e]">{sel.size} playing</span>
      </div>

      <div className="max-h-[55vh] overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
            <tr><th className="px-3 py-2 text-left">Playing</th><th className="px-3 py-2 text-left">Player</th><th className="px-3 py-2 text-left">#</th><th className="px-3 py-2 text-center">GK</th><th className="px-3 py-2 text-center">C</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {shown.map((p) => {
              const row = sel.get(p.memberId);
              return (
                <tr key={p.memberId} className={row ? "bg-emerald-50/50" : "hover:bg-slate-50"}>
                  <td className="px-3 py-2"><input type="checkbox" checked={!!row} disabled={closed} onChange={() => toggle(p.memberId)} aria-label={`${p.name} playing`} className="h-4 w-4 accent-[#06054e]" /></td>
                  <td className="px-3 py-2 font-semibold text-slate-800">{p.name}{p.status && p.status.toLowerCase() !== "active" && <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-slate-500">{p.status}</span>}</td>
                  <td className="px-3 py-2"><input type="number" min={0} max={999} disabled={!row || closed} value={row?.shirtNumber ?? ""} aria-label={`${p.name} shirt number`} onChange={(e) => patch(p.memberId, { shirtNumber: e.target.value === "" ? null : Number(e.target.value) })} className="w-16 rounded-lg border border-slate-200 px-2 py-1 text-sm disabled:bg-slate-50" /></td>
                  <td className="px-3 py-2 text-center"><input type="checkbox" disabled={!row || closed} checked={!!row?.isGoalkeeper} onChange={(e) => patch(p.memberId, { isGoalkeeper: e.target.checked })} aria-label={`${p.name} goalkeeper`} /></td>
                  <td className="px-3 py-2 text-center"><button disabled={!row || closed} onClick={() => patch(p.memberId, { isCaptain: !row?.isCaptain })} aria-label={`${p.name} captain`} aria-pressed={!!row?.isCaptain} className="disabled:opacity-30"><Star size={16} className={row?.isCaptain ? "fill-amber-400 text-amber-500" : "text-slate-300"} /></button></td>
                </tr>
              );
            })}
            {shown.length === 0 && <tr><td colSpan={5} className="px-3 py-8 text-center text-slate-500">No players found.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 p-3">
        <button onClick={save} disabled={busy || closed} className="rounded-xl bg-[#06054e] px-5 py-2 text-sm font-bold text-white disabled:opacity-40">{busy ? "Saving…" : "Save roster"}</button>
        {msg && <span role="status" className={`text-sm font-semibold ${msg.ok ? "text-emerald-700" : "text-red-600"}`}>{msg.text}</span>}
      </div>
    </div>
  );
}
