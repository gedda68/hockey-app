"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Lock, Search, Shield, Star } from "lucide-react";

interface TeamLite { teamId: string; name: string; clubId: string | null }
interface Match { fixtureId: string; round: string | null; scheduledStart: string | null; status: string; home: boolean; opponent: string }
interface Player { memberId: string; name: string; appearances: number; status: string | null }
interface Squad { team: TeamLite; matches: Match[]; players: Player[] }
interface LineupPlayer { memberId: string; shirtNumber: number | null; isGoalkeeper: boolean; isCaptain: boolean; started: boolean; minuteEntered: number | null; didNotPlay: boolean }
interface Win { open: boolean; closesAt: string | null; requiresReason: boolean; reason: string | null }

const base = (sc: string) => `/api/admin/season-competitions/${encodeURIComponent(sc)}`;
const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "No date");

export default function CompetitionTeamsTab({ seasonCompetitionId }: { seasonCompetitionId: string }) {
  const [teams, setTeams] = useState<TeamLite[] | null>(null);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [squad, setSquad] = useState<Squad | null>(null);
  const [fixtureId, setFixtureId] = useState<string | null>(null);
  const [sel, setSel] = useState<Map<string, LineupPlayer>>(new Map());
  const [win, setWin] = useState<Win | null>(null);
  const [reason, setReason] = useState("");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${base(seasonCompetitionId)}/squad`)
      .then(async (r) => { const j = await r.json(); if (!r.ok) throw new Error(j.error); setTeams(j.teams); })
      .catch((e) => setError(e.message));
  }, [seasonCompetitionId]);

  useEffect(() => {
    if (!teamId) return;
    setSquad(null); setFixtureId(null);
    fetch(`${base(seasonCompetitionId)}/squad?teamId=${encodeURIComponent(teamId)}`)
      .then(async (r) => { const j = await r.json(); if (!r.ok) throw new Error(j.error); setSquad(j); })
      .catch((e) => setError(e.message));
  }, [seasonCompetitionId, teamId]);

  const loadLineup = useCallback(async (fid: string, tid: string) => {
    setMsg(null); setReason("");
    const r = await fetch(`${base(seasonCompetitionId)}/fixtures/${encodeURIComponent(fid)}/lineups/${encodeURIComponent(tid)}`);
    const j = await r.json();
    if (!r.ok) { setMsg({ ok: false, text: j.error ?? "Could not load roster" }); return; }
    setWin(j.window);
    setSel(new Map((j.lineup.players as LineupPlayer[]).map((p) => [p.memberId, p])));
  }, [seasonCompetitionId]);

  useEffect(() => { if (fixtureId && teamId) void loadLineup(fixtureId, teamId); }, [fixtureId, teamId, loadLineup]);

  const toggle = (id: string) =>
    setSel((m) => {
      const n = new Map(m);
      if (n.has(id)) n.delete(id);
      else n.set(id, { memberId: id, shirtNumber: null, isGoalkeeper: false, isCaptain: false, started: false, minuteEntered: null, didNotPlay: false });
      return n;
    });
  const patch = (id: string, p: Partial<LineupPlayer>) =>
    setSel((m) => { const n = new Map(m); const cur = n.get(id); if (cur) n.set(id, { ...cur, ...p }); return n; });

  const save = async () => {
    if (!fixtureId || !teamId) return;
    setBusy(true); setMsg(null);
    const r = await fetch(`${base(seasonCompetitionId)}/fixtures/${encodeURIComponent(fixtureId)}/lineups/${encodeURIComponent(teamId)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ players: [...sel.values()], staff: [], reason: reason || undefined }),
    });
    const j = await r.json();
    setBusy(false);
    setMsg(r.ok ? { ok: true, text: "Roster saved." } : { ok: false, text: j.error ?? "Save failed" });
    if (r.ok) setWin(j.window);
  };

  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    return (squad?.players ?? []).filter((p) => !n || p.name.toLowerCase().includes(n));
  }, [squad, q]);
  const match = squad?.matches.find((m) => m.fixtureId === fixtureId) ?? null;
  const locked = win ? !win.open : false;

  if (error) return <p role="alert" className="text-sm font-semibold text-red-600">{error}</p>;
  if (!teams) return <div className="h-48 animate-pulse rounded-2xl bg-slate-200/70" />;

  return (
    <div className="grid gap-5 lg:grid-cols-[18rem_1fr]">
      <aside className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm lg:max-h-[75vh] lg:overflow-y-auto">
        <p className="px-3 py-2 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Teams ({teams.length})</p>
        <ul>
          {teams.map((t) => (
            <li key={t.teamId}>
              <button
                onClick={() => setTeamId(t.teamId)}
                aria-current={teamId === t.teamId}
                className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-bold transition ${teamId === t.teamId ? "bg-[#06054e] text-white" : "text-slate-700 hover:bg-slate-100"}`}
              >
                <Shield size={14} className="shrink-0 opacity-60" /> {t.name}
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <div className="min-w-0 space-y-4">
        {!teamId && <p className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">Select a team to see its eligible players and match rosters.</p>}
        {teamId && !squad && <div className="h-48 animate-pulse rounded-2xl bg-slate-200/70" />}

        {squad && (
          <>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-lg font-black text-[#06054e]">{squad.team.name}</h2>
              <p className="text-xs text-slate-500">{squad.players.length} eligible players · {squad.matches.length} matches</p>
              <label className="mt-3 block text-xs font-bold uppercase tracking-wide text-slate-500" htmlFor="match-pick">Match</label>
              <select
                id="match-pick"
                value={fixtureId ?? ""}
                onChange={(e) => setFixtureId(e.target.value || null)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold"
              >
                <option value="">All eligible players (no match selected)</option>
                {squad.matches.map((m) => (
                  <option key={m.fixtureId} value={m.fixtureId}>
                    {m.round ? `${m.round} · ` : ""}{m.home ? "vs" : "@"} {m.opponent} · {fmt(m.scheduledStart)}{m.status !== "scheduled" ? ` · ${m.status.replace("_", " ")}` : ""}
                  </option>
                ))}
              </select>

              {match && win && (
                <p className={`mt-3 flex items-start gap-2 rounded-xl px-3 py-2 text-xs font-semibold ${locked ? "bg-red-50 text-red-700" : win.requiresReason ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-700"}`}>
                  <Lock size={14} className="mt-0.5 shrink-0" />
                  {locked
                    ? win.reason
                    : win.requiresReason
                    ? `${win.reason} As an association admin you can still change it — a reason is required.`
                    : win.closesAt ? `Clubs can change this roster until ${fmt(win.closesAt)}.` : "Roster is open for changes."}
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 p-3">
                <div className="relative w-full sm:w-64">
                  <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search players…" aria-label="Search players"
                    className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-sm focus:border-[#06054e] focus:outline-none focus:ring-2 focus:ring-[#06054e]/20" />
                </div>
                {match && <span className="text-sm font-bold text-[#06054e]">{sel.size} playing</span>}
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
                    <tr>
                      {match && <th className="px-3 py-2 text-left">Playing</th>}
                      <th className="px-3 py-2 text-left">Player</th>
                      <th className="px-3 py-2 text-right">Games</th>
                      {match && <><th className="px-3 py-2 text-left">#</th><th className="px-3 py-2 text-center">GK</th><th className="px-3 py-2 text-center">C</th></>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.map((p) => {
                      const row = sel.get(p.memberId);
                      return (
                        <tr key={p.memberId} className={row ? "bg-emerald-50/50" : "hover:bg-slate-50"}>
                          {match && (
                            <td className="px-3 py-2">
                              <input type="checkbox" checked={!!row} disabled={locked} onChange={() => toggle(p.memberId)} aria-label={`${p.name} playing`} className="h-4 w-4 accent-[#06054e]" />
                            </td>
                          )}
                          <td className="px-3 py-2 font-semibold text-slate-800">
                            {p.name}
                            {p.status && p.status.toLowerCase() !== "active" && <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-slate-500">{p.status}</span>}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-slate-500">{p.appearances}</td>
                          {match && (
                            <>
                              <td className="px-3 py-2">
                                <input type="number" min={0} max={999} disabled={!row || locked} value={row?.shirtNumber ?? ""} aria-label={`${p.name} shirt number`}
                                  onChange={(e) => patch(p.memberId, { shirtNumber: e.target.value === "" ? null : Number(e.target.value) })}
                                  className="w-16 rounded-lg border border-slate-200 px-2 py-1 text-sm disabled:bg-slate-50" />
                              </td>
                              <td className="px-3 py-2 text-center"><input type="checkbox" disabled={!row || locked} checked={!!row?.isGoalkeeper} onChange={(e) => patch(p.memberId, { isGoalkeeper: e.target.checked })} aria-label={`${p.name} goalkeeper`} /></td>
                              <td className="px-3 py-2 text-center">
                                <button disabled={!row || locked} onClick={() => patch(p.memberId, { isCaptain: !row?.isCaptain })} aria-label={`${p.name} captain`} aria-pressed={!!row?.isCaptain} className="disabled:opacity-30">
                                  <Star size={16} className={row?.isCaptain ? "fill-amber-400 text-amber-500" : "text-slate-300"} />
                                </button>
                              </td>
                            </>
                          )}
                        </tr>
                      );
                    })}
                    {filtered.length === 0 && <tr><td colSpan={6} className="px-3 py-8 text-center text-slate-500">No players found.</td></tr>}
                  </tbody>
                </table>
              </div>

              {match && (
                <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 p-3">
                  {win?.requiresReason && (
                    <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason for late change (required)" aria-label="Reason for late change"
                      className="min-w-0 flex-1 rounded-xl border border-amber-300 px-3 py-2 text-sm" />
                  )}
                  <button onClick={save} disabled={busy || locked}
                    className="rounded-xl bg-[#06054e] px-5 py-2 text-sm font-bold text-white disabled:opacity-40">
                    {busy ? "Saving…" : "Save roster"}
                  </button>
                  {msg && <span role="status" className={`text-sm font-semibold ${msg.ok ? "text-emerald-700" : "text-red-600"}`}>{msg.text}</span>}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
