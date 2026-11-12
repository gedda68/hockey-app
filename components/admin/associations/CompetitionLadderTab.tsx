"use client";

import { useEffect, useState } from "react";
import type { StandingsRow } from "@/lib/competitions/standings";

export default function CompetitionLadderTab({ seasonCompetitionId }: { seasonCompetitionId: string }) {
  const [rows, setRows] = useState<StandingsRow[] | null>(null);
  const [needsApproval, setNeedsApproval] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

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
    </div>
  );
}
