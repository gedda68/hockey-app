"use client";
// Draw generator: choose the divisions and their teams, set dates, times and pitches, preview the whole draw (a club's
// matches across divisions back to back at one ground), see clashes and suggested umpires, then save it unpublished.

import { use, useEffect, useMemo, useState } from "react";
import PageHeader from "@/components/admin/PageHeader";
import type { DrawPlan } from "@/lib/draw/service";

type Comp = { seasonCompetitionId: string; competitionName?: string; season?: string };
type Team = { teamId: string; name: string; clubName: string };
type Div = { seasonCompetitionId: string; teamIds: string[] };

const fmtDay = (d: string | null) => (d ? new Date(`${d}T00:00:00Z`).toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }) : "No date");
const fmtTime = (iso: string | null) => (iso ? new Date(iso).toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit", timeZone: "Australia/Brisbane" }) : "Not placed");
const inp = "px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold";

export default function DrawGeneratorPage({ params }: { params: Promise<{ associationId: string }> }) {
  const { associationId } = use(params);
  const [comps, setComps] = useState<Comp[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [divs, setDivs] = useState<Div[]>([{ seasonCompetitionId: "", teamIds: [] }]);
  const [startDate, setStartDate] = useState("");
  const [times, setTimes] = useState("08:00, 09:45, 11:30, 13:15");
  const [slotMinutes, setSlotMinutes] = useState(90);
  const [gap, setGap] = useState(7);
  const [buffer, setBuffer] = useState(15);
  const [blackout, setBlackout] = useState("");
  const [dbl, setDbl] = useState(false);
  const [align, setAlign] = useState(true);
  const [withUmps, setWithUmps] = useState(true);
  const [replace, setReplace] = useState(false);
  const [plan, setPlan] = useState<DrawPlan | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/associations/${associationId}/season-competitions`).then((r) => r.json()).then((d) => setComps(d.seasonCompetitions ?? [])).catch(() => {});
    fetch(`/api/admin/associations/${associationId}/league-builder-teams`).then((r) => r.json()).then((d) => setTeams(d.teams ?? [])).catch(() => {});
  }, [associationId]);

  const compName = (id: string) => { const c = comps.find((x) => x.seasonCompetitionId === id); return c ? `${c.competitionName || id} ${c.season ?? ""}`.trim() : id; };
  const body = useMemo(() => ({
    divisions: divs.filter((d) => d.seasonCompetitionId), doubleRound: dbl, alignClubs: align, startDate, roundGapDays: gap, slotMinutes, bufferMinutes: buffer,
    slotTimes: times.split(/[,\s]+/).filter(Boolean), blackoutDates: blackout.split(/[,\s]+/).filter(Boolean), suggestUmpires: withUmps, replace,
  }), [divs, dbl, align, startDate, gap, slotMinutes, buffer, times, blackout, withUmps, replace]);
  const takenElsewhere = (idx: number) => new Set(divs.flatMap((d, i) => (i === idx ? [] : d.teamIds)));
  const setDiv = (i: number, f: Partial<Div>) => setDivs((all) => all.map((d, k) => (k === i ? { ...d, ...f } : d)));

  async function run(apply: boolean, applyUmpires = false) {
    setBusy(true); setMsg("");
    const r = await fetch(`/api/admin/associations/${associationId}/draw`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, apply, applyUmpires }) });
    const d = await r.json().catch(() => ({}));
    if (d.plan) setPlan(d.plan);
    if (!r.ok) setMsg(d.error || "Something went wrong");
    else if (apply) setMsg(`Saved ${d.saved.fixtures} fixtures in ${d.saved.competitions} division${d.saved.competitions === 1 ? "" : "s"}${d.saved.umpireAssignments ? ` and ${d.saved.umpireAssignments} umpire allocations` : ""}. They are not published yet.`);
    setBusy(false);
  }
  async function check() {
    setBusy(true); setMsg("");
    const ids = divs.map((d) => d.seasonCompetitionId).filter(Boolean);
    const all = await Promise.all(ids.map((id) => fetch(`/api/admin/season-competitions/${encodeURIComponent(id)}/draw/check`).then((r) => r.json()).catch(() => null)));
    const clashes = all.flatMap((a) => a?.clashes ?? []), n = all.reduce((s, a) => s + (a?.fixtures ?? 0), 0);
    setMsg(clashes.length ? `${clashes.length} clash${clashes.length === 1 ? "" : "es"} in the ${n} saved fixtures` : `No clashes in the ${n} saved fixtures`);
    setPlan({ fixtures: [], roundDates: {}, unplaced: [], homeAway: {}, alignment: { grouped: 0, together: 0, matches: 0 }, clashes, umpireGaps: [], umpireLoad: [] });
    setBusy(false);
  }

  const ready = divs.some((d) => d.seasonCompetitionId && d.teamIds.length >= 2) && divs.every((d) => !d.seasonCompetitionId || d.teamIds.length >= 2) && !!startDate;
  const blocks = plan?.clashes.filter((c) => c.severity === "block").length ?? 0;
  const days = plan ? [...new Set(plan.fixtures.map((f) => f.date))] : [];

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-5">
      <PageHeader eyebrow="Competitions" title="Draw generator" subtitle="Builds every division's rounds together, keeps a club's matches across divisions back to back at one ground, and suggests umpires." />

      <section className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4">
        <div className="flex flex-wrap gap-3 items-end">
          <label className="text-xs font-black uppercase text-slate-500">First round<br /><input type="date" className={inp} value={startDate} onChange={(e) => setStartDate(e.target.value)} /></label>
          <label className="text-xs font-black uppercase text-slate-500">Days between rounds<br /><input type="number" min={1} max={28} className={`${inp} w-24`} value={gap} onChange={(e) => setGap(Number(e.target.value))} /></label>
          <label className="text-xs font-black uppercase text-slate-500">Match length (min)<br /><input type="number" min={30} max={240} className={`${inp} w-24`} value={slotMinutes} onChange={(e) => setSlotMinutes(Number(e.target.value))} /></label>
          <label className="text-xs font-black uppercase text-slate-500">Gap between matches (min)<br /><input type="number" min={0} max={120} className={`${inp} w-24`} value={buffer} onChange={(e) => setBuffer(Number(e.target.value))} /></label>
          <label className="text-xs font-black uppercase text-slate-500">Start times (one per match slot)<br /><input className={`${inp} w-64`} value={times} onChange={(e) => setTimes(e.target.value)} /></label>
          <label className="text-xs font-black uppercase text-slate-500">Dates with no play<br /><input className={`${inp} w-64`} placeholder="2026-04-03, 2026-04-25" value={blackout} onChange={(e) => setBlackout(e.target.value)} /></label>
        </div>
        <div className="flex flex-wrap gap-5 text-sm font-bold text-slate-700">
          <label className="flex items-center gap-2"><input type="checkbox" checked={align} onChange={(e) => setAlign(e.target.checked)} /> Keep each club meeting together across divisions</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={dbl} onChange={(e) => setDbl(e.target.checked)} /> Home and away (play twice)</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={withUmps} onChange={(e) => setWithUmps(e.target.checked)} /> Suggest umpires</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={replace} onChange={(e) => setReplace(e.target.checked)} /> Replace these divisions&apos; existing fixtures</label>
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-black text-slate-700">Divisions</h2>
          {divs.map((d, i) => {
            const taken = takenElsewhere(i), avail = teams.filter((t) => !taken.has(t.teamId));
            return (
              <div key={i} className="border border-slate-200 rounded-xl p-3">
                <div className="flex flex-wrap items-center gap-3">
                  <select className={inp} aria-label="Division" value={d.seasonCompetitionId} onChange={(e) => setDiv(i, { seasonCompetitionId: e.target.value })}>
                    <option value="">Choose division…</option>
                    {comps.filter((c) => c.seasonCompetitionId === d.seasonCompetitionId || !divs.some((x) => x.seasonCompetitionId === c.seasonCompetitionId)).map((c) => <option key={c.seasonCompetitionId} value={c.seasonCompetitionId}>{compName(c.seasonCompetitionId)}</option>)}
                  </select>
                  <span className="text-xs font-bold text-slate-500">{d.teamIds.length} teams</span>
                  <button className="text-xs font-black text-slate-500" onClick={() => setDiv(i, { teamIds: d.teamIds.length === avail.length ? [] : avail.map((t) => t.teamId) })}>{d.teamIds.length === avail.length ? "Clear" : "Select all"}</button>
                  {divs.length > 1 && <button className="text-xs font-black text-red-600 ml-auto" onClick={() => setDivs((all) => all.filter((_, k) => k !== i))}>Remove division</button>}
                </div>
                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-1 mt-2 max-h-44 overflow-auto">
                  {avail.map((t) => <label key={t.teamId} className="flex items-center gap-2 text-sm font-semibold text-slate-700"><input type="checkbox" checked={d.teamIds.includes(t.teamId)} onChange={(e) => setDiv(i, { teamIds: e.target.checked ? [...d.teamIds, t.teamId] : d.teamIds.filter((x) => x !== t.teamId) })} />{t.name} <span className="text-slate-400">{t.clubName}</span></label>)}
                </div>
              </div>
            );
          })}
          <button className="text-sm font-black text-indigo-700" onClick={() => setDivs((all) => [...all, { seasonCompetitionId: "", teamIds: [] }])}>+ Add another division</button>
        </div>

        <div className="flex flex-wrap gap-3">
          <button disabled={!ready || busy} onClick={() => run(false)} className="px-4 py-2 rounded-xl bg-slate-800 text-white text-sm font-black disabled:opacity-40">Preview draw</button>
          <button disabled={!divs.some((d) => d.seasonCompetitionId) || busy} onClick={check} className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-sm font-black disabled:opacity-40">Check saved fixtures for clashes</button>
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
            <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
              <h2 className="text-base font-black text-slate-800">Draw: {plan.fixtures.length} matches{plan.unplaced.length ? `, ${plan.unplaced.length} not placed` : ""}</h2>
              <div className="flex gap-2">
                <button disabled={busy || blocks > 0 || plan.unplaced.length > 0} onClick={() => run(true, false)} className="px-4 py-2 rounded-xl bg-slate-800 text-white text-sm font-black disabled:opacity-40">Save draw</button>
                {withUmps && <button disabled={busy || blocks > 0 || plan.unplaced.length > 0} onClick={() => run(true, true)} className="px-4 py-2 rounded-xl bg-indigo-700 text-white text-sm font-black disabled:opacity-40">Save draw and umpires</button>}
              </div>
            </div>
            {plan.alignment.grouped > 0 && <p className="text-xs font-bold text-slate-500 mb-2">{plan.alignment.grouped} of {plan.alignment.matches} matches are part of a club meeting across divisions; {plan.alignment.together} are back to back at one ground.</p>}
            {(blocks > 0 || plan.unplaced.length > 0) && <p className="text-xs font-bold text-red-700 mb-2">Fix the clashes or add more pitches, times or dates before saving.</p>}
            {days.map((day) => {
              const rows = plan.fixtures.filter((f) => f.date === day);
              return (
                <div key={day ?? "none"} className="mt-4">
                  <h3 className="text-sm font-black text-slate-700 mb-1">{fmtDay(day)} <span className="text-slate-400 font-bold">Round {rows[0] ? Object.entries(plan.roundDates).find(([, v]) => v === day)?.[0] : ""}</span></h3>
                  <div className="overflow-x-auto"><table className="w-full text-sm">
                    <thead><tr className="text-left text-xs font-black uppercase text-slate-500"><th className="py-1 px-2">Time</th><th className="px-2">Division</th><th className="px-2">Match</th><th className="px-2">Ground</th><th className="px-2">Umpires</th></tr></thead>
                    <tbody>{rows.map((f, i) => (
                      <tr key={f.key} className={`border-t border-slate-100 align-top ${f.groupKey && rows[i - 1]?.groupKey !== f.groupKey ? "border-t-2 border-t-slate-300" : ""}`}>
                        <td className="py-1.5 px-2 font-semibold whitespace-nowrap">{fmtTime(f.start)}</td>
                        <td className="px-2 font-bold">{f.divisionName}</td>
                        <td className="px-2 font-bold">{f.homeName} v {f.awayName}{f.warnings.map((w) => <div key={w} className="text-xs font-semibold text-amber-700">{w}</div>)}</td>
                        <td className="px-2">{f.venueName ?? "-"}</td>
                        <td className="px-2">{f.umpires.length ? f.umpires.map((u) => u.umpireName).join(", ") : withUmps ? <span className="text-amber-700 font-semibold">{plan.umpireGaps.find((g) => g.key === f.key)?.reason ?? ""}</span> : ""}</td>
                      </tr>))}</tbody>
                  </table></div>
                </div>
              );
            })}
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
