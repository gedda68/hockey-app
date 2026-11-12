"use client";

import { useEffect, useState } from "react";
import type { CompetitionSummary } from "@/lib/competitions/panelOverview";

export default function CompetitionStatsStrip({
  associationId, seasonCompetitionId,
}: { associationId: string; seasonCompetitionId: string }) {
  const [s, setS] = useState<CompetitionSummary | null>(null);
  useEffect(() => {
    let live = true;
    fetch(`/api/admin/associations/${encodeURIComponent(associationId)}/competition-panel?seasonCompetitionId=${encodeURIComponent(seasonCompetitionId)}`)
      .then((r) => r.json())
      .then((j) => live && setS(j.competitions?.[0]?.summary ?? null))
      .catch(() => {});
    return () => { live = false; };
  }, [associationId, seasonCompetitionId]);

  if (!s) return <div className="h-24 animate-pulse rounded-2xl bg-slate-200/70" />;
  const items: [string, number, boolean?][] = [
    ["Teams", s.teams], ["Played", s.completed], ["To play", s.remaining],
    ["To approve", s.awaitingApproval, true], ["Overdue", s.overdue, true], ["No date", s.unscheduled, true],
  ];
  return (
    <div className="grid grid-cols-3 gap-3 lg:grid-cols-6">
      {items.map(([label, value, warn]) => (
        <div key={label} className={`rounded-2xl border p-4 ${warn && value > 0 ? "border-amber-200 bg-amber-50 text-amber-800" : "border-slate-200 bg-white text-[#06054e]"}`}>
          <div className="text-2xl font-black tabular-nums">{value}</div>
          <div className="text-[11px] font-bold uppercase tracking-wider opacity-70">{label}</div>
        </div>
      ))}
    </div>
  );
}
