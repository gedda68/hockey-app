"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle, CalendarClock, CheckCircle2, ChevronRight, Search, Users,
} from "lucide-react";
import type { CompetitionSummary } from "@/lib/competitions/panelOverview";

interface Row {
  seasonCompetitionId: string;
  status: string;
  label: string;
  summary: CompetitionSummary;
}
interface Payload { season: string | null; seasons: string[]; competitions: Row[] }

type Filter = "all" | "attention" | "active" | "completed";

const statusStyle: Record<string, string> = {
  completed: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  in_progress: "bg-sky-50 text-sky-700 ring-sky-200",
  draft: "bg-slate-100 text-slate-600 ring-slate-200",
};
const needsAttention = (c: Row) =>
  c.summary.awaitingApproval + c.summary.overdue + c.summary.unscheduled > 0;

function Kpi({ label, value, tone = "slate" }: { label: string; value: number | string; tone?: "slate" | "amber" | "emerald" | "sky" }) {
  const tones = {
    slate: "from-white to-slate-50 text-[#06054e]",
    amber: "from-amber-50 to-white text-amber-700",
    emerald: "from-emerald-50 to-white text-emerald-700",
    sky: "from-sky-50 to-white text-sky-700",
  };
  return (
    <div className={`rounded-2xl border border-slate-200/70 bg-gradient-to-br ${tones[tone]} p-4 shadow-sm`}>
      <div className="text-2xl sm:text-3xl font-black tabular-nums leading-none">{value}</div>
      <div className="mt-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-4 animate-pulse" aria-busy="true">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => <div key={i} className="h-20 rounded-2xl bg-slate-200/70" />)}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="h-44 rounded-2xl bg-slate-200/70" />)}
      </div>
    </div>
  );
}

export default function CompetitionPanelOverview({ associationId }: { associationId: string }) {
  const [season, setSeason] = useState<string | null>(null);
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    let live = true;
    setError(null);
    const qs = season ? `?season=${encodeURIComponent(season)}` : "";
    fetch(`/api/admin/associations/${encodeURIComponent(associationId)}/competition-panel${qs}`)
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || "Failed to load");
        if (live) setData(j);
      })
      .catch((e) => live && setError(e.message));
    return () => { live = false; };
  }, [associationId, season]);

  const list = data?.competitions ?? [];
  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return list.filter((c) => {
      if (needle && !c.label.toLowerCase().includes(needle)) return false;
      if (filter === "attention") return needsAttention(c);
      if (filter === "completed") return c.summary.remaining === 0 && c.summary.inProgress === 0;
      if (filter === "active") return c.summary.remaining > 0 || c.summary.inProgress > 0;
      return true;
    });
  }, [list, q, filter]);

  if (error) {
    return (
      <div role="alert" className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
        <AlertTriangle size={16} /> {error}
      </div>
    );
  }
  if (!data) return <Skeleton />;

  const base = `/admin/associations/${encodeURIComponent(associationId)}/competition-panel`;
  const t = list.reduce(
    (a, c) => ({
      fixtures: a.fixtures + c.summary.fixtures,
      played: a.played + c.summary.completed,
      approve: a.approve + c.summary.awaitingApproval,
      overdue: a.overdue + c.summary.overdue,
      nodate: a.nodate + c.summary.unscheduled,
    }),
    { fixtures: 0, played: 0, approve: 0, overdue: 0, nodate: 0 },
  );
  const filters: [Filter, string][] = [
    ["all", `All (${list.length})`],
    ["attention", `Needs attention (${list.filter(needsAttention).length})`],
    ["active", "In play"],
    ["completed", "Completed"],
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label="Competitions" value={list.length} />
        <Kpi label="Fixtures played" value={`${t.played} / ${t.fixtures}`} tone="emerald" />
        <Kpi label="Results to approve" value={t.approve} tone={t.approve ? "amber" : "slate"} />
        <Kpi label="Overdue / no date" value={`${t.overdue} / ${t.nodate}`} tone={t.overdue + t.nodate ? "amber" : "slate"} />
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter competitions">
          {filters.map(([k, label]) => (
            <button
              key={k}
              role="tab"
              aria-selected={filter === k}
              onClick={() => setFilter(k)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                filter === k ? "bg-[#06054e] text-white shadow" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-slate-300"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1 lg:w-64">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search competitions…"
              aria-label="Search competitions"
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm focus:border-[#06054e] focus:outline-none focus:ring-2 focus:ring-[#06054e]/20"
            />
          </div>
          <select
            aria-label="Season"
            value={data.season ?? ""}
            onChange={(e) => setSeason(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-[#06054e]"
          >
            {data.seasons.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {visible.length === 0 && (
        <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
          No competitions match.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {visible.map((c) => {
          const s = c.summary;
          const pct = s.fixtures ? Math.round((s.completed / s.fixtures) * 100) : 0;
          const issues = s.awaitingApproval + s.overdue + s.unscheduled;
          return (
            <Link
              key={c.seasonCompetitionId}
              href={`${base}/${encodeURIComponent(c.seasonCompetitionId)}`}
              className="group relative flex flex-col rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#06054e]/40 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#06054e]"
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-lg font-black leading-tight text-[#06054e]">{c.label}</h2>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ring-1 ${statusStyle[c.status] ?? statusStyle.draft}`}>
                  {c.status.replace("_", " ")}
                </span>
              </div>

              <div className="mt-4">
                <div className="mb-1.5 flex items-baseline justify-between text-xs">
                  <span className="font-bold text-slate-700">{s.completed} of {s.fixtures} played</span>
                  <span className="font-black tabular-nums text-[#06054e]">{pct}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                  <div className="h-full rounded-full bg-gradient-to-r from-[#06054e] to-sky-500" style={{ width: `${pct}%` }} />
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-600">
                <span className="inline-flex items-center gap-1.5"><Users size={13} /> {s.teams} teams</span>
                <span className="inline-flex items-center gap-1.5"><CalendarClock size={13} /> {s.remaining} to play</span>
              </div>

              <div className="mt-3 flex min-h-6 flex-wrap gap-1.5">
                {issues === 0 ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
                    <CheckCircle2 size={12} /> All clear
                  </span>
                ) : (
                  <>
                    {s.awaitingApproval > 0 && <Badge>{s.awaitingApproval} to approve</Badge>}
                    {s.overdue > 0 && <Badge>{s.overdue} overdue</Badge>}
                    {s.unscheduled > 0 && <Badge>{s.unscheduled} no date</Badge>}
                  </>
                )}
              </div>

              {s.nextStart && (
                <p className="mt-2 text-[11px] text-slate-400">Next: {new Date(s.nextStart).toLocaleString()}</p>
              )}
              <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-[#06054e] opacity-70 transition group-hover:opacity-100">
                Manage competition <ChevronRight size={14} className="transition group-hover:translate-x-0.5" />
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-800 ring-1 ring-amber-200">
      <AlertTriangle size={11} /> {children}
    </span>
  );
}
