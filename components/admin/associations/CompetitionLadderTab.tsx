"use client";

import { useEffect, useState } from "react";
import type { StandingsRow } from "@/lib/competitions/standings";
import type { PointsAdjustment } from "@/lib/competitions/pointsAdjustments";

export default function CompetitionLadderTab({ seasonCompetitionId }: { seasonCompetitionId: string }) {
  const [rows, setRows] = useState<StandingsRow[] | null>(null);
  const [needsApproval, setNeedsApproval] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [adjs, setAdjs] = useState<PointsAdjustment[]>([]);
  const [adjTeam, setAdjTeam] = useState("");
  const [adjPts, setAdjPts] = useState("");
  const [adjReason, setAdjReason] = useState("");
  const [adjMsg, setAdjMsg] = useState<string | null>(null);
  const adjUrl = `/api/admin/season-competitions/${encodeURIComponent(seasonCompetitionId)}/points-adjustments`;

  useEffect(() => {
    fetch(adjUrl).then((r) => r.json()).then((j) => setAdjs(j.adjustments ?? [])).catch(() => {});
  }, [adjUrl, tick]);

  const callAdj = async (method: "POST" | "DELETE", body: unknown) => {
    setAdjMsg(null);
    const r = await fetch(adjUrl, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setAdjMsg(j.error ?? "Failed"); return; }
    setAdjPts(""); setAdjReason("");
    setTick((n) => n + 1);
  };

  useEffect(() => {
    let live = true;
    setRows(null);
    setError(null);
    fetch(`/api/admin/season-competitions/${encodeURIComponent(seasonCompetitionId)}/standings?includeUnpublished=1`)
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || "Failed to load ladder");
        if (live) { setRows(j.standings ?? []); setNeedsApproval(Boolean(j.requiresResultApproval)); }
      })
      .catch((e) => live && setError(e.message));
    return () => { live = false; };
  }, [seasonCompetitionId, tick]);

  if (error) return <p role="alert" className="text-sm font-semibold text-red-600">{error}</p>;
  if (!rows) return <div className="h-64 animate-pulse rounded-2xl bg-slate-200/70" />;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-500">
          Calculated live from results{needsApproval ? " (approved results only)" : ""}.
        </p>
        <button onClick={() => setTick((n) => n + 1)} className="rounded-lg bg-[#06054e] px-3 py-1.5 text-xs font-bold text-white hover:opacity-90">
          Recalculate
        </button>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-3 py-2 text-left">#</th>
              <th className="px-3 py-2 text-left">Team</th>
              {["P", "W", "D", "L", "GF", "GA", "GD", "Pts"].map((h) => <th key={h} className="px-3 py-2 text-right">{h}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 tabular-nums">
            {rows.map((r) => (
              <tr key={r.teamId} className="hover:bg-slate-50">
                <td className="px-3 py-2 font-bold text-slate-400">{r.pos}</td>
                <td className="px-3 py-2 font-bold text-[#06054e]">{r.teamName ?? r.teamId}</td>
                {[r.p, r.w, r.d, r.l, r.gf, r.ga, r.gd].map((v, i) => <td key={i} className="px-3 py-2 text-right">{v}</td>)}
                <td className="px-3 py-2 text-right font-black text-[#06054e]">{r.pts}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={10} className="px-3 py-8 text-center text-slate-500">No results yet.</td></tr>}
          </tbody>
        </table>
      </div>

      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-black uppercase tracking-wide text-[#06054e]">Points adjustments</h3>
        <div className="grid gap-2 sm:grid-cols-[1fr_6rem_2fr_auto]">
          <select value={adjTeam} onChange={(e) => setAdjTeam(e.target.value)} aria-label="Team" className="rounded-xl border border-slate-300 px-3 py-2 text-sm">
            <option value="">Team…</option>
            {rows.map((r) => <option key={r.teamId} value={r.teamId}>{r.teamName ?? r.teamId}</option>)}
          </select>
          <input type="number" value={adjPts} onChange={(e) => setAdjPts(e.target.value)} placeholder="± pts" aria-label="Points (negative to deduct)" className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
          <input value={adjReason} onChange={(e) => setAdjReason(e.target.value)} placeholder="Reason (required)" aria-label="Reason" className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
          <button disabled={!adjTeam || !adjPts || adjReason.trim().length < 3}
            onClick={() => void callAdj("POST", { teamId: adjTeam, points: Number(adjPts), reason: adjReason })}
            className="rounded-xl bg-[#06054e] px-4 py-2 text-sm font-bold text-white disabled:opacity-40">Add</button>
        </div>
        {adjMsg && <p role="alert" className="text-sm font-semibold text-red-600">{adjMsg}</p>}
        <ul className="divide-y divide-slate-100 text-sm">
          {adjs.map((a) => {
            const t = rows.find((r) => r.teamId === a.teamId);
            return (
              <li key={a.adjustmentId} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span><b className={a.points < 0 ? "text-red-600" : "text-emerald-700"}>{a.points > 0 ? "+" : ""}{a.points}</b>{" "}
                  <span className="font-semibold text-[#06054e]">{t?.teamName ?? a.teamId}</span>
                  <span className="text-slate-500"> — {a.reason}</span></span>
                <button className="text-xs font-bold text-red-600 hover:underline" onClick={() => {
                  const reason = window.prompt("Reason for removing this adjustment?");
                  if (reason && reason.trim().length >= 3) void callAdj("DELETE", { adjustmentId: a.adjustmentId, reason });
                }}>Remove</button>
              </li>
            );
          })}
          {adjs.length === 0 && <li className="py-2 text-slate-500">No adjustments.</li>}
        </ul>
      </section>
    </div>
  );
}
