"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, GitBranch, Loader2, Trophy } from "lucide-react";

type PublicFx = {
  fixtureId: string;
  phase?: string;
  drawMatchId?: string | null;
  bracketTag?: string | null;
  knockoutRoundLabel?: string | null;
  knockoutRoundIndex?: number | null;
  matchOrder?: number | null;
  homeSourceLabel?: string | null;
  awaySourceLabel?: string | null;
  poolLabel?: string | null;
  poolRound?: number | null;
  sequence?: number;
  homeTeamName?: string | null;
  awayTeamName?: string | null;
  scheduledStart?: string | null;
  venueName?: string | null;
  addressLine?: string | null;
  timezone?: string | null;
  status?: string;
  result?: {
    homeScore?: number | null;
    awayScore?: number | null;
    resultType?: string;
  } | null;
  resultStatus?: string | null;
};

type ApiResponse = {
  tournamentId: string;
  title: string;
  requiresResultApproval?: boolean;
  championTeamName?: string | null;
  fixtures: PublicFx[];
  error?: string;
};

function sideName(f: PublicFx, side: "home" | "away"): string {
  if (side === "home") {
    return f.homeTeamName || f.homeSourceLabel || "TBD";
  }
  return f.awayTeamName || f.awaySourceLabel || "TBD";
}

function formatScheduleLine(iso: string | null | undefined, tz?: string | null): string {
  if (!iso) return "Schedule TBD";
  try {
    const d = new Date(iso);
    return d.toLocaleString("en-AU", {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    });
  } catch {
    return iso;
  }
}

export default function PublicTournamentPage() {
  const params = useParams();
  const tournamentId = String(params.tournamentId ?? "");

  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [view, setView] = useState<"bracket" | "schedule">("bracket");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!tournamentId) return;
    setLoading(true);
    setErr("");
    try {
      const r = await fetch(
        `/api/rep-tournament-fixtures?tournamentId=${encodeURIComponent(tournamentId)}`,
      );
      const j = (await r.json()) as ApiResponse;
      if (!r.ok) {
        setErr(typeof j.error === "string" ? j.error : "Failed to load");
        setData(null);
        return;
      }
      setData(j);
      setSelectedId((prev) => {
        if (prev) return prev;
        const firstKo = j.fixtures?.find((x) => x.phase === "knockout");
        const first = firstKo ?? j.fixtures?.[0];
        return first?.fixtureId ?? null;
      });
    } catch {
      setErr("Failed to load");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);

  useEffect(() => {
    void load();
  }, [load]);

  const fixtures = data?.fixtures ?? [];
  const selected = fixtures.find((x) => x.fixtureId === selectedId) ?? null;

  const knockoutByRound = useMemo(() => {
    const ko = fixtures.filter((f) => f.phase === "knockout");
    const map = new Map<number, PublicFx[]>();
    for (const f of ko) {
      const ri = f.knockoutRoundIndex ?? 0;
      const list = map.get(ri) ?? [];
      list.push(f);
      map.set(ri, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => (a.matchOrder ?? 0) - (b.matchOrder ?? 0));
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [fixtures]);

  const scheduleGroups = useMemo(() => {
    const sorted = [...fixtures].sort((a, b) => {
      const ta = a.scheduledStart ?? "";
      const tb = b.scheduledStart ?? "";
      if (ta !== tb) return ta.localeCompare(tb);
      return (a.sequence ?? 0) - (b.sequence ?? 0);
    });
    const groups = new Map<string, PublicFx[]>();
    for (const f of sorted) {
      const key = f.scheduledStart ? f.scheduledStart.slice(0, 10) : "tbd";
      const g = groups.get(key) ?? [];
      g.push(f);
      groups.set(key, g);
    }
    return [...groups.entries()].sort(([a], [b]) => {
      if (a === "tbd") return 1;
      if (b === "tbd") return -1;
      return a.localeCompare(b);
    });
  }, [fixtures]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Link
            href="/representative"
            className="text-sm font-semibold text-slate-500 hover:text-[#06054e]"
          >
            ← Representative
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-slate-500 py-20 justify-center">
            <Loader2 className="animate-spin" size={22} />
            Loading tournament…
          </div>
        ) : err ? (
          <p className="text-red-600 font-medium py-12 text-center">{err}</p>
        ) : data ? (
          <>
            <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-3xl font-black text-[#06054e] tracking-tight">
                  {data.title}
                </h1>
                <p className="text-sm text-slate-500 font-mono mt-1">{data.tournamentId}</p>
                {data.championTeamName ? (
                  <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-amber-50 border border-amber-200 px-4 py-1.5 text-sm font-bold text-amber-900">
                    <Trophy size={16} />
                    Champion: {data.championTeamName}
                  </div>
                ) : null}
              </div>
              <div className="flex rounded-2xl border-2 border-slate-200 bg-white p-1 shadow-sm">
                <button
                  type="button"
                  onClick={() => setView("bracket")}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase flex items-center gap-2 transition-colors ${
                    view === "bracket"
                      ? "bg-[#06054e] text-white"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <GitBranch size={14} />
                  Bracket
                </button>
                <button
                  type="button"
                  onClick={() => setView("schedule")}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase flex items-center gap-2 transition-colors ${
                    view === "schedule"
                      ? "bg-[#06054e] text-white"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <CalendarDays size={14} />
                  Fixtures
                </button>
              </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                {view === "bracket" ? (
                  knockoutByRound.length === 0 ? (
                    <p className="text-slate-600 text-sm bg-white rounded-2xl border border-slate-200 p-6">
                      No knockout fixtures are published yet. Switch to{" "}
                      <strong>Fixtures</strong> for the full list, or check back after the draw
                      is finalised.
                    </p>
                  ) : (
                    <div className="overflow-x-auto pb-4">
                      <div className="flex gap-6 min-w-min items-stretch">
                        {knockoutByRound.map(([roundIdx, matches]) => (
                          <div key={roundIdx} className="flex flex-col gap-4 w-52 shrink-0">
                            <h2 className="text-[10px] font-black uppercase text-slate-400 text-center tracking-widest">
                              {matches[0]?.knockoutRoundLabel ?? `Round ${roundIdx + 1}`}
                            </h2>
                            {matches.map((m) => (
                              <button
                                key={m.fixtureId}
                                type="button"
                                onClick={() => setSelectedId(m.fixtureId)}
                                className={`text-left rounded-2xl border-2 transition-all p-3 shadow-sm ${
                                  selectedId === m.fixtureId
                                    ? "border-[#06054e] bg-indigo-50/50 ring-2 ring-[#06054e]/20"
                                    : "border-slate-200 bg-white hover:border-slate-300"
                                }`}
                              >
                                <div className="text-xs font-bold text-slate-800 truncate">
                                  {sideName(m, "home")}
                                </div>
                                <div className="text-[10px] text-center text-slate-400 font-black py-0.5">
                                  VS
                                </div>
                                <div className="text-xs font-bold text-slate-800 truncate">
                                  {sideName(m, "away")}
                                </div>
                                {m.result && (
                                  <div className="mt-2 text-center text-sm font-black text-[#06054e]">
                                    {m.result.homeScore ?? "—"} – {m.result.awayScore ?? "—"}
                                  </div>
                                )}
                              </button>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                ) : (
                  <div className="space-y-8">
                    {scheduleGroups.map(([dateKey, list]) => (
                      <section key={dateKey}>
                        <h2 className="text-xs font-black uppercase text-slate-400 mb-3 tracking-widest">
                          {dateKey === "tbd"
                            ? "Date TBD"
                            : new Date(dateKey + "T12:00:00").toLocaleDateString("en-AU", {
                                weekday: "long",
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                              })}
                        </h2>
                        <ul className="space-y-2">
                          {list.map((m) => (
                            <li key={m.fixtureId}>
                              <button
                                type="button"
                                onClick={() => setSelectedId(m.fixtureId)}
                                className={`w-full flex flex-wrap items-center justify-between gap-2 rounded-2xl border-2 px-4 py-3 text-left transition-all ${
                                  selectedId === m.fixtureId
                                    ? "border-[#06054e] bg-indigo-50/40"
                                    : "border-slate-200 bg-white hover:border-slate-300"
                                }`}
                              >
                                <div className="font-bold text-slate-800 text-sm">
                                  <span>{sideName(m, "home")}</span>
                                  <span className="text-slate-400 mx-2 font-normal">v</span>
                                  <span>{sideName(m, "away")}</span>
                                </div>
                                <div className="text-xs text-slate-500">
                                  {m.phase === "knockout"
                                    ? (m.knockoutRoundLabel ?? "Knockout")
                                    : (m.poolLabel ?? "Pool")}
                                  {m.scheduledStart
                                    ? ` · ${formatScheduleLine(m.scheduledStart, m.timezone)}`
                                    : ""}
                                </div>
                              </button>
                            </li>
                          ))}
                        </ul>
                      </section>
                    ))}
                  </div>
                )}
              </div>

              <aside className="lg:col-span-1">
                <div className="sticky top-6 rounded-3xl border-2 border-slate-200 bg-white shadow-sm overflow-hidden">
                  <div className="bg-[#06054e] text-white px-5 py-3 text-xs font-black uppercase tracking-wider">
                    Match detail
                  </div>
                  {selected ? (
                    <div className="p-5 space-y-4">
                      <div>
                        <p className="text-[10px] font-black uppercase text-slate-400 mb-2">
                          Fixture
                        </p>
                        <p className="text-lg font-black text-slate-900 leading-tight">
                          {sideName(selected, "home")}
                        </p>
                        <p className="text-center text-slate-400 text-xs font-black py-1">v</p>
                        <p className="text-lg font-black text-slate-900 leading-tight">
                          {sideName(selected, "away")}
                        </p>
                      </div>
                      <div className="border-t border-slate-100 pt-4 space-y-2 text-sm text-slate-600">
                        <p>
                          <span className="font-bold text-slate-800">Phase:</span>{" "}
                          {selected.phase ?? "—"}
                        </p>
                        {selected.phase === "knockout" ? (
                          <p>
                            <span className="font-bold text-slate-800">Round:</span>{" "}
                            {selected.knockoutRoundLabel ?? "—"}
                          </p>
                        ) : (
                          <p>
                            <span className="font-bold text-slate-800">Pool:</span>{" "}
                            {selected.poolLabel ?? "—"}
                          </p>
                        )}
                        <p>
                          <span className="font-bold text-slate-800">When:</span>{" "}
                          {formatScheduleLine(selected.scheduledStart, selected.timezone)}
                        </p>
                        {(selected.venueName || selected.addressLine) && (
                          <p>
                            <span className="font-bold text-slate-800">Venue:</span>{" "}
                            {[selected.venueName, selected.addressLine].filter(Boolean).join(" · ")}
                          </p>
                        )}
                      </div>
                      <div className="border-t border-slate-100 pt-4">
                        <p className="text-[10px] font-black uppercase text-slate-400 mb-2">
                          Result
                        </p>
                        {selected.result ? (
                          <p className="text-2xl font-black text-[#06054e]">
                            {selected.result.homeScore ?? "—"} – {selected.result.awayScore ?? "—"}
                            <span className="block text-xs font-semibold text-slate-500 mt-1 normal-case">
                              {selected.resultStatus === "approved"
                                ? "Final"
                                : data.requiresResultApproval
                                  ? "Pending approval"
                                  : "Recorded"}
                            </span>
                          </p>
                        ) : (
                          <p className="text-slate-500 text-sm">No result yet.</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="p-5 text-sm text-slate-500">Select a match.</p>
                  )}
                </div>
              </aside>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
