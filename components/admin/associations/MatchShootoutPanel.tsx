"use client";
// Shootout entry for a fixture: one row per attempt (shooter, keeper faced, goal/miss).

import { useCallback, useEffect, useState } from "react";
import { Check, Plus, Trash2, X } from "lucide-react";
import {
  attemptNumber, draftsFromEvents, mergeShootoutEvents, shootoutTotals, type ShootoutDraft,
} from "@/lib/competitions/shootout";

interface RosterOpt { memberId: string; displayName: string; isPlayer?: boolean }
interface Ctx {
  homeTeamId: string; awayTeamId: string; homeTeamName: string; awayTeamName: string;
  homeRoster: RosterOpt[]; awayRoster: RosterOpt[]; matchEvents: Array<Record<string, unknown>>;
}

const sel = "w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm";

export default function MatchShootoutPanel({
  seasonCompetitionId, fixtureId, recordedHome, recordedAway, onUseTotals, onSaved,
}: {
  seasonCompetitionId: string; fixtureId: string;
  recordedHome: string; recordedAway: string;
  onUseTotals: (home: number, away: number) => void;
  onSaved: () => Promise<void> | void;
}) {
  const base = `/api/admin/season-competitions/${encodeURIComponent(seasonCompetitionId)}/fixtures/${encodeURIComponent(fixtureId)}`;
  const [ctx, setCtx] = useState<Ctx | null>(null);
  const [drafts, setDrafts] = useState<ShootoutDraft[]>([]);
  const [opened, setOpened] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch(`${base}/match-events-context`, { credentials: "include" });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || "Could not load the match");
    setCtx(j as Ctx);
    setDrafts(draftsFromEvents(j.matchEvents));
  }, [base]);

  useEffect(() => { load().catch((e) => setMsg({ ok: false, text: e.message })); }, [load]);

  if (!ctx) return msg ? <p className="text-sm text-red-600">{msg.text}</p> : <p className="text-sm text-slate-400">Loading…</p>;

  const show = opened || drafts.length > 0 || recordedHome !== "" || recordedAway !== "";
  if (!show) {
    return (
      <button type="button" onClick={() => setOpened(true)} className="rounded-xl border border-dashed border-slate-300 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100">
        This match went to a shootout
      </button>
    );
  }

  // Only people who play: coaches and managers are left out unless they are also playing.
  // A person already chosen on a saved attempt stays listed so existing data is never hidden.
  const rosterOf = (teamId: string, keep: string[] = []) =>
    (teamId === ctx.homeTeamId ? ctx.homeRoster : ctx.awayRoster).filter(
      (r) => r.isPlayer !== false || keep.includes(r.memberId),
    );
  const other = (teamId: string) => (teamId === ctx.homeTeamId ? ctx.awayTeamId : ctx.homeTeamId);
  const nameOf = (teamId: string) => (teamId === ctx.homeTeamId ? ctx.homeTeamName : ctx.awayTeamName);
  const totals = shootoutTotals(drafts, ctx.homeTeamId, ctx.awayTeamId);
  const recorded = recordedHome !== "" && recordedAway !== "";
  const matches = recorded && Number(recordedHome) === totals.home && Number(recordedAway) === totals.away;

  const add = (teamId: string) => setDrafts((d) => [...d, { teamId, shooterId: "", goalkeeperId: "", scored: true }]);
  const patch = (i: number, p: Partial<ShootoutDraft>) => setDrafts((d) => d.map((x, n) => (n === i ? { ...x, ...p } : x)));
  const nextTeam = drafts.length === 0 ? ctx.homeTeamId : other(drafts[drafts.length - 1].teamId);

  const save = async () => {
    if (drafts.some((d) => !d.shooterId)) { setMsg({ ok: false, text: "Pick a shooter for every attempt." }); return; }
    setBusy(true); setMsg(null);
    try {
      const events = mergeShootoutEvents(ctx.matchEvents, drafts).map((e) => ({
        eventId: (e.eventId as string) || undefined,
        kind: e.kind, teamId: e.teamId, memberId: e.memberId,
        assistMemberId: e.kind === "goal" ? (e.assistMemberId as string | null) ?? null : undefined,
        goalkeeperMemberId: String(e.kind).startsWith("shootout") ? (e.goalkeeperMemberId as string | null) ?? null : undefined,
        period: (e.period as number | null) ?? null,
        minute: (e.minute as number | null) ?? null,
        notes: (e.notes as string | null) ?? null,
      }));
      const r = await fetch(`${base}/match-events`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ events, skipRosterValidation: true }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "Save failed");
      setMsg({ ok: true, text: "Shootout saved." });
      await load();
      await onSaved();
    } catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : String(e) }); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-xl bg-slate-900 px-4 py-3 text-white">
        <span className="text-sm font-bold">{ctx.homeTeamName}</span>
        <span className="text-2xl font-black tabular-nums">{totals.home} – {totals.away}</span>
        <span className="text-sm font-bold">{ctx.awayTeamName}</span>
      </div>

      {drafts.length > 0 && !matches && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
          {recorded ? `The recorded shootout score is ${recordedHome}–${recordedAway}, which differs from these attempts.` : "No shootout score is recorded yet."}{" "}
          <button type="button" className="underline" onClick={() => onUseTotals(totals.home, totals.away)}>Use {totals.home}–{totals.away}</button>
        </p>
      )}

      <ol className="space-y-2">
        {drafts.map((d, i) => (
          <li key={i} className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="mb-2 flex items-center justify-between text-xs font-black uppercase text-slate-400">
              <span>{nameOf(d.teamId)} · attempt {attemptNumber(drafts, i)}</span>
              <button type="button" aria-label="Remove attempt" onClick={() => setDrafts((x) => x.filter((_, n) => n !== i))} className="text-slate-400 hover:text-red-600"><Trash2 size={14} /></button>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <select aria-label="Shooter" className={sel} value={d.shooterId} onChange={(e) => patch(i, { shooterId: e.target.value })}>
                <option value="">Shooter…</option>
                {rosterOf(d.teamId, [d.shooterId]).map((r) => <option key={r.memberId} value={r.memberId}>{r.displayName}</option>)}
              </select>
              <select aria-label="Goalkeeper faced" className={sel} value={d.goalkeeperId} onChange={(e) => patch(i, { goalkeeperId: e.target.value })}>
                <option value="">Keeper faced…</option>
                {rosterOf(other(d.teamId), [d.goalkeeperId]).map((r) => <option key={r.memberId} value={r.memberId}>{r.displayName}</option>)}
              </select>
              <div className="flex gap-1.5">
                <button type="button" aria-pressed={d.scored} aria-label="Scored" onClick={() => patch(i, { scored: true })}
                  className={`flex h-9 w-9 items-center justify-center rounded-full ring-2 ${d.scored ? "bg-emerald-500 text-white ring-emerald-500" : "text-emerald-600 ring-emerald-200"}`}><Check size={18} /></button>
                <button type="button" aria-pressed={!d.scored} aria-label="Missed" onClick={() => patch(i, { scored: false })}
                  className={`flex h-9 w-9 items-center justify-center rounded-full ring-2 ${!d.scored ? "bg-red-500 text-white ring-red-500" : "text-red-500 ring-red-200"}`}><X size={18} /></button>
              </div>
            </div>
          </li>
        ))}
      </ol>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => add(nextTeam)} className="inline-flex items-center gap-1 rounded-xl bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-200"><Plus size={14} /> Add {nameOf(nextTeam)} attempt</button>
        <button type="button" onClick={() => add(other(nextTeam))} className="inline-flex items-center gap-1 rounded-xl bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-200"><Plus size={14} /> Add {nameOf(other(nextTeam))} attempt</button>
        <button type="button" disabled={busy} onClick={save} className="ml-auto rounded-xl bg-[#06054e] px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Save shootout</button>
      </div>
      {msg && <p role="status" className={`text-sm font-semibold ${msg.ok ? "text-emerald-700" : "text-red-700"}`}>{msg.text}</p>}
    </div>
  );
}
