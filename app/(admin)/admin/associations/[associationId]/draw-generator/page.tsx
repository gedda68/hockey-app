"use client";
// Draw generator: pick a competition and its teams, set dates, times and pitches, preview the draw with its clashes and
// suggested umpires, then save it as unpublished fixtures.

import { use, useEffect, useMemo, useState } from "react";
import PageHeader from "@/components/admin/PageHeader";
import type { DrawPlan } from "@/lib/draw/service";

type Comp = { seasonCompetitionId: string; competitionName?: string; season?: string };
type Team = { teamId: string; name: string; clubName: string };

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString("en-AU", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Australia/Brisbane" }) : "Not placed");
const inp = "px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold";

export default function DrawGeneratorPage({ params }: { params: Promise<{ associationId: string }> }) {
  const { associationId } = use(params);
  const [comps, setComps] = useState<Comp[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [sc, setSc] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [startDate, setStartDate] = useState("");
  const [times, setTimes] = useState("08:00, 09:30, 11:00");
  const [slotMinutes, setSlotMinutes] = useState(90);
  const [gap, setGap] = useState(7);
  const [blackout, setBlackout] = useState("");
  const [dbl, setDbl] = useState(false);
  const [withUmps, setWithUmps] = useState(true);
  const [replace, setReplace] = useState(false);
  const [plan, setPlan] = useState<DrawPlan | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/associations/${associationId}/season-competitions`).then((r) => r.json()).then((d) => setComps(d.seasonCompetitions ?? [])).catch(() => {});
    fetch(`/api/admin/associations/${associationId}/league-builder-teams`).then((r) => r.json()).then((d) => setTeams(d.teams ?? [])).catch(() => {});
  }, [associationId]);

  const body = useMemo(() => ({
    teamIds: picked, doubleRound: dbl, startDate, roundGapDays: gap, slotMinutes,
    slotTimes: times.split(/[,\s]+/).filter(Boolean), blackoutDates: blackout.split(/[,\s]+/).filter(Boolean), suggestUmpires: withUmps, replace,
  }), [picked, dbl, startDate, gap, slotMinutes, times, blackout, withUmps, replace]);

  async function run(apply: boolean, applyUmpires = false) {
    setBusy(true); setMsg("");
    const r = await fetch(`/api/admin/season-competitions/${encodeURIComponent(sc)}/draw`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, apply, applyUmpires }) });
    const d = await r.json().catch(() => ({}));
    if (d.plan) setPlan(d.plan);
    if (!r.ok) setMsg(d.error || "Something went wrong");
    else if (apply) setMsg(`Saved ${d.saved.fixtures} fixtures${d.saved.umpireAssignments ? ` and ${d.saved.umpireAssignments} umpire allocations` : ""}. They are not published yet.`);
    setBusy(false);
  }
  async function check() {
    setBusy(true); setMsg("");
    const r = await fetch(`/api/admin/season-competitions/${encodeURIComponent(sc)}/draw/check`);
    const d = await r.json().catch(() => ({}));
    setMsg(r.ok ? (d.clashes.length ? `${d.clashes.length} clash${d.clashes.length === 1 ? "" : "es"} in the ${d.fixtures} saved fixtures` : `No clashes in the ${d.fixtures} saved fixtures`) : d.error || "Could not check");
    setPlan(r.ok ? { fixtures: [], roundDates: {}, unplaced: [], homeAway: {}, clashes: d.clashes, umpireGaps: [], umpireLoad: [] } : null);
    setBusy(false);
  }

  const ready = !!sc && picked.length >= 2 && !!startDate;
  const blocks = plan?.clashes.filter((c) => c.severity === "block").length ?? 0;
  const rounds = plan ? [...new Set(plan.fixtures.map((f) => f.round))] : [];

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-5">
      <PageHeader eyebrow="Competitions" title="Draw generator" subtitle="Builds the rounds, places every match on a pitch and time without clashes, and suggests umpires." />

      <section className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4">
        <div className="flex flex-wrap gap-3 items-end">
          <label className="text-xs font-black uppercase text-slate-500">Competition<br /><select className={inp} value={sc} onChange={(e) => setSc(e.target.value)}><option value="">Choose…</option>{comps.map((c) => <option key={c.seasonCompetitionId} value={c.seasonCompetitionId}>{c.competitionName || c.seasonCompetitionId} {c.season ?? ""}</option>)}</select></label>
          <label className="text-xs font-black uppercase text-slate-500">First round<br /><input type="date" className={inp} value={startDate} onChange={(e) => setStartDate(e.target.value)} /></label>
          <label className="text-xs font-black uppercase text-slate-500">Days between rounds<br /><input type="number" min={1} max={28} className={`${inp} w-24`} value={gap} onChange={(e) => setGap(Number(e.target.value))} /></label>
          <label className="text-xs font-black uppercase text-slate-500">Match length (min)<br /><input type="number" min={30} max={240} className={`${inp} w-24`} value={slotMinutes} onChange={(e) => setSlotMinutes(Number(e.target.value))} /></label>
          <label className="text-xs font-black uppercase text-slate-500">Start times<br /><input className={`${inp} w-52`} value={times} onChange={(e) => setTimes(e.target.value)} /></label>
          <label className="text-xs font-black uppercase text-slate-500">Dates with no play<br /><input className={`${inp} w-64`} placeholder="2026-04-03, 2026-04-25" value={blackout} onChange={(e) => setBlackout(e.target.value)} /></label>
        </div>
        <div className="flex flex-wrap gap-5 text-sm font-bold text-slate-700">
          <label className="flex items-center gap-2"><input type="checkbox" checked={dbl} onChange={(e) => setDbl(e.target.checked)} /> Home and away (play twice)</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={withUmps} onChange={(e) => setWithUmps(e.target.checked)} /> Suggest umpires</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={replace} onChange={(e) => setReplace(e.target.checked)} /> Replace this competition&apos;s existing fixtures</label>
        </div>
        <div>
          <div className="flex items-center justify-between"><h2 className="text-sm font-black text-slate-700">Teams ({picked.length})</h2><button className="text-xs font-black text-slate-500" onClick={() => setPicked(picked.length === teams.length ? [] : teams.map((t) => t.teamId))}>{picked.length === teams.length ? "Clear" : "Select all"}</button></div>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-1 mt-2 max-h-56 overflow-auto">
            {teams.map((t) => <label key={t.teamId} className="flex items-center gap-2 text-sm font-semibold text-slate-700"><input type="checkbox" checked={picked.includes(t.teamId)} onChange={(e) => setPicked((p) => e.target.checked ? [...p, t.teamId] : p.filter((x) => x !== t.teamId))} />{t.name} <span className="text-slate-400">{t.clubName}</span></label>)}
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <button disabled={!ready || busy} onClick={() => run(false)} className="px-4 py-2 rounded-xl bg-slate-800 text-white text-sm font-black disabled:opacity-40">Preview draw</button>
          <button disabled={!sc || busy} onClick={check} className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-sm font-black disabled:opacity-40">Check saved fixtures for clashes</button>
        </div>
      </section>

      {msg && <p className="text-sm font-bold text-slate-700">{msg}</p>}

      {plan && plan.clashes.length > 0 && (
        <section className="bg-white rounded-2xl border border-slate-100 p-5">
          <h2 className="text-base font-black text-slate-800 mb-2">Clashes ({plan.clashes.length})</h2>
          <ul className="text-sm font-semibold space-y-1">{plan.clashes.map((c, i) => <li key={i} className={c.severity === "block" ? "text-red-700" : "text-amber-700"}>{c.severity === "block" ? "Must fix: " : "Check: "}{c.message}</li>)}</ul>
        </section>
      )}

      {plan && plan.fixtures.length > 0 && (
        <>
          <section className="bg-white rounded-2xl border border-slate-100 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <h2 className="text-base font-black text-slate-800">Draw: {plan.fixtures.length} matches, {rounds.length} rounds{plan.unplaced.length ? `, ${plan.unplaced.length} not placed` : ""}</h2>
              <div className="flex gap-2">
                <button disabled={busy || blocks > 0 || plan.unplaced.length > 0} onClick={() => run(true, false)} className="px-4 py-2 rounded-xl bg-slate-800 text-white text-sm font-black disabled:opacity-40">Save draw</button>
                {withUmps && <button disabled={busy || blocks > 0 || plan.unplaced.length > 0} onClick={() => run(true, true)} className="px-4 py-2 rounded-xl bg-indigo-700 text-white text-sm font-black disabled:opacity-40">Save draw and umpires</button>}
              </div>
            </div>
            {(blocks > 0 || plan.unplaced.length > 0) && <p className="text-xs font-bold text-red-700 mb-2">Fix the clashes or add more pitches, times or dates before saving.</p>}
            <div className="overflow-x-auto"><table className="w-full text-sm">
              <thead><tr className="text-left text-xs font-black uppercase text-slate-500"><th className="py-1.5 px-2">Rd</th><th className="px-2">When</th><th className="px-2">Match</th><th className="px-2">Pitch</th><th className="px-2">Umpires</th></tr></thead>
              <tbody>{plan.fixtures.map((f) => (
                <tr key={f.key} className="border-t border-slate-100 align-top">
                  <td className="py-1.5 px-2 font-bold">{f.round}</td>
                  <td className="px-2 font-semibold">{fmt(f.start)}</td>
                  <td className="px-2 font-bold">{f.homeName} v {f.awayName}{f.warnings.map((w) => <div key={w} className="text-xs font-semibold text-amber-700">{w}</div>)}</td>
                  <td className="px-2">{f.venueName ?? "-"}</td>
                  <td className="px-2">{f.umpires.length ? f.umpires.map((u) => u.umpireName).join(", ") : withUmps ? <span className="text-amber-700 font-semibold">{plan.umpireGaps.find((g) => g.key === f.key)?.reason ?? ""}</span> : ""}</td>
                </tr>))}</tbody>
            </table></div>
          </section>
          {plan.umpireLoad.length > 0 && (
            <section className="bg-white rounded-2xl border border-slate-100 p-5">
              <h2 className="text-base font-black text-slate-800 mb-2">Umpire workload</h2>
              <p className="text-xs font-semibold text-slate-500 mb-2">Matches suggested for each official across this draw.</p>
              <div className="flex flex-wrap gap-2">{plan.umpireLoad.map((u) => <span key={u.id} className="px-3 py-1 rounded-full bg-slate-100 text-xs font-bold text-slate-700">{u.name}: {u.matches}</span>)}</div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
