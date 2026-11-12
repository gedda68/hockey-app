"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { CompetitionSummary } from "@/lib/competitions/panelOverview";

interface Row {
  seasonCompetitionId: string;
  status: string;
  label: string;
  summary: CompetitionSummary;
}
interface Payload {
  season: string | null;
  seasons: string[];
  competitions: Row[];
}

const TOOLS = [
  ["Fixtures & results", "fixtures-console"],
  ["Match events", "match-events"],
  ["Teams", "division-teams"],
] as const;

function Stat({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
  return (
    <div className={`rounded-lg px-3 py-2 ${warn && value > 0 ? "bg-amber-50 text-amber-800" : "bg-slate-50 text-slate-700"}`}>
      <div className="text-lg font-black leading-none">{value}</div>
      <div className="text-[11px] font-semibold uppercase tracking-wide opacity-70">{label}</div>
    </div>
  );
}

export default function CompetitionPanelOverview({ associationId }: { associationId: string }) {
  const [season, setSeason] = useState<string | null>(null);
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    setError(null);
    const q = season ? `?season=${encodeURIComponent(season)}` : "";
    fetch(`/api/admin/associations/${encodeURIComponent(associationId)}/competition-panel${q}`)
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || "Failed to load");
        if (live) setData(j);
      })
      .catch((e) => live && setError(e.message));
    return () => { live = false; };
  }, [associationId, season]);

  if (error) return <p className="text-sm font-semibold text-red-600">{error}</p>;
  if (!data) return <p className="text-sm text-slate-500">Loading competitions…</p>;

  const base = `/admin/associations/${encodeURIComponent(associationId)}`;
  const totals = data.competitions.reduce(
    (a, c) => ({
      fixtures: a.fixtures + c.summary.fixtures,
      awaiting: a.awaiting + c.summary.awaitingApproval,
      overdue: a.overdue + c.summary.overdue,
      unscheduled: a.unscheduled + c.summary.unscheduled,
    }),
    { fixtures: 0, awaiting: 0, overdue: 0, unscheduled: 0 },
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm font-bold text-slate-600" htmlFor="panel-season">Season</label>
        <select
          id="panel-season"
          value={data.season ?? ""}
          onChange={(e) => setSeason(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold"
        >
          {data.seasons.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <p className="text-sm text-slate-500">
          {data.competitions.length} competitions · {totals.fixtures} fixtures ·{" "}
          <span className={totals.awaiting ? "font-bold text-amber-700" : ""}>{totals.awaiting} results awaiting approval</span> ·{" "}
          {totals.overdue} overdue · {totals.unscheduled} unscheduled
        </p>
      </div>

      {data.competitions.length === 0 && (
        <p className="text-sm text-slate-500">No competitions found for this season.</p>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data.competitions.map((c) => (
          <section key={c.seasonCompetitionId} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <header className="mb-3 flex items-start justify-between gap-2">
              <h2 className="text-base font-black text-[#06054e]">{c.label}</h2>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold uppercase text-slate-600">{c.status.replace("_", " ")}</span>
            </header>
            <div className="grid grid-cols-3 gap-2">
              <Stat label="Teams" value={c.summary.teams} />
              <Stat label="Played" value={c.summary.completed} />
              <Stat label="To play" value={c.summary.remaining} />
              <Stat label="To approve" value={c.summary.awaitingApproval} warn />
              <Stat label="Overdue" value={c.summary.overdue} warn />
              <Stat label="No date" value={c.summary.unscheduled} warn />
            </div>
            {c.summary.nextStart && (
              <p className="mt-2 text-xs text-slate-500">Next: {new Date(c.summary.nextStart).toLocaleString()}</p>
            )}
            <nav className="mt-3 flex flex-wrap gap-2">
              {TOOLS.map(([name, path]) => (
                <Link
                  key={path}
                  href={`${base}/${path}?seasonCompetitionId=${encodeURIComponent(c.seasonCompetitionId)}`}
                  className="rounded-lg bg-[#06054e] px-3 py-1 text-xs font-bold text-white hover:opacity-90"
                >
                  {name}
                </Link>
              ))}
            </nav>
          </section>
        ))}
      </div>
    </div>
  );
}
