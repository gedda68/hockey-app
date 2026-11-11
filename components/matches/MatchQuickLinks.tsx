"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { PickerSeason } from "@/lib/competitions/competitionPickerOptions";
import type { DivisionMatchListItem } from "@/lib/data/divisionMatchList";

interface MatchQuickLinksProps {
  seasons: PickerSeason[];
  /** The match being viewed (highlighted; its year + division are the defaults). */
  currentFixtureId: string;
  currentSeasonCompetitionId: string;
  initialMatches: DivisionMatchListItem[];
}

const selectCls =
  "h-11 w-full appearance-none rounded-xl border border-white/15 bg-white/10 pl-3 pr-9 text-sm font-semibold text-white outline-none transition hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-sky-400 [&_optgroup]:bg-white [&_optgroup]:text-slate-500 [&_option]:bg-white [&_option]:text-slate-900";

export default function MatchQuickLinks({
  seasons,
  currentFixtureId,
  currentSeasonCompetitionId,
  initialMatches,
}: MatchQuickLinksProps) {
  const seasonOf = (scId: string) =>
    seasons.find((s) => s.groups.some((g) => g.options.some((o) => o.id === scId)))?.season ?? seasons[0]?.season ?? "";

  const [season, setSeason] = useState(() => seasonOf(currentSeasonCompetitionId));
  const [scId, setScId] = useState(currentSeasonCompetitionId);
  const [matches, setMatches] = useState<DivisionMatchListItem[]>(initialMatches);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cache = useRef(new Map<string, DivisionMatchListItem[]>([[currentSeasonCompetitionId, initialMatches]]));

  const current = seasons.find((s) => s.season === season);
  const divisionLabel = current?.groups.flatMap((g) => g.options).find((o) => o.id === scId)?.label ?? "";

  useEffect(() => {
    if (!scId) return;
    const hit = cache.current.get(scId);
    if (hit) {
      setMatches(hit);
      setError(null);
      return;
    }
    const ac = new AbortController();
    setLoading(true);
    setError(null);
    fetch(`/api/public/division-matches?seasonCompetitionId=${encodeURIComponent(scId)}`, { signal: ac.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: { matches: DivisionMatchListItem[] }) => {
        cache.current.set(scId, d.matches);
        setMatches(d.matches);
      })
      .catch((e) => {
        if (e?.name !== "AbortError") setError("Couldn't load matches.");
      })
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, [scId]);

  // Group by round (finals keep their stage label)
  const rounds = useMemo(() => {
    const map = new Map<string, { key: string; label: string; items: DivisionMatchListItem[]; round: number }>();
    for (const m of matches) {
      const key = m.stage ? `f-${m.round ?? 0}` : `r-${m.round ?? 0}`;
      const label = m.stage ? (m.round != null ? `Finals · ${m.stage}` : m.stage) : m.round != null ? `Round ${m.round}` : "Unscheduled";
      const g = map.get(key) ?? { key, label, items: [], round: m.round ?? Number.MAX_SAFE_INTEGER };
      if (m.stage && g.items.length && !g.label.includes(m.stage)) {
        g.label = /semi/i.test(m.stage) && /semi/i.test(g.label) ? "Finals · Semi Finals" : "Finals";
      }
      g.items.push(m);
      map.set(key, g);
    }
    // Rounds in number order (a rescheduled game keeps its round), finals after
    return [...map.values()].sort((a, b) => a.round - b.round);
  }, [matches]);

  const openRoundKey = useMemo(
    () => rounds.find((r) => r.items.some((m) => m.fixtureId === currentFixtureId))?.key ?? null,
    [rounds, currentFixtureId],
  );

  const onSeason = (value: string) => {
    setSeason(value);
    const s = seasons.find((x) => x.season === value);
    // keep the same division name in the new season when it exists
    const sameName = s?.groups.flatMap((g) => g.options).find((o) => o.label === divisionLabel);
    setScId(sameName?.id ?? s?.groups[0]?.options[0]?.id ?? "");
  };

  return (
    <aside className="rounded-3xl border border-white/10 bg-white/5 p-5 text-white lg:sticky lg:top-6" aria-label="Quick links">
      <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-yellow-200">Quick links</h2>

      <div className="mt-4 grid grid-cols-[6.5rem_1fr] gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-bold uppercase tracking-widest text-white/50">Year</span>
          <span className="relative">
            <select className={selectCls} value={season} onChange={(e) => onSeason(e.target.value)}>
              {seasons.map((s) => (
                <option key={s.season} value={s.season}>
                  {s.season}
                </option>
              ))}
            </select>
            <Chevron />
          </span>
        </label>
        <label className="flex min-w-0 flex-col gap-1">
          <span className="text-[11px] font-bold uppercase tracking-widest text-white/50">Division</span>
          <span className="relative">
            <select className={selectCls} value={scId} onChange={(e) => setScId(e.target.value)}>
              {current?.groups.map((g) =>
                current.groups.length > 1 ? (
                  <optgroup key={g.league} label={g.league}>
                    {g.options.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.label}
                      </option>
                    ))}
                  </optgroup>
                ) : (
                  g.options.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))
                ),
              )}
            </select>
            <Chevron />
          </span>
        </label>
      </div>

      {scId && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Link
            href={`/competitions/standings?seasonCompetitionId=${encodeURIComponent(scId)}`}
            className="inline-flex h-10 items-center justify-center rounded-xl bg-[#06054e] text-xs font-bold uppercase tracking-wider text-white hover:bg-[#1a1870]"
          >
            Ladder
          </Link>
          <Link
            href={`/competitions/matches?view=results&seasonCompetitionId=${encodeURIComponent(scId)}&round=All&status=All`}
            className="inline-flex h-10 items-center justify-center rounded-xl bg-[#06054e] text-xs font-bold uppercase tracking-wider text-white hover:bg-[#1a1870]"
          >
            All results
          </Link>
        </div>
      )}

      <div className="mt-4 max-h-[60vh] overflow-y-auto pr-1" aria-busy={loading}>
        {loading && <p className="py-4 text-sm text-white/60">Loading matches…</p>}
        {error && <p className="py-4 text-sm text-rose-300">{error}</p>}
        {!loading && !error && rounds.length === 0 && <p className="py-4 text-sm text-white/60">No published matches.</p>}
        {!loading &&
          !error &&
          rounds.map((r) => (
            <details key={`${scId}-${r.key}`} open={r.key === openRoundKey} className="group border-b border-white/10 last:border-0">
              <summary className="flex cursor-pointer list-none items-center justify-between py-2.5 text-sm font-bold text-white/90 hover:text-white">
                <span>{r.label}</span>
                <span className="flex items-center gap-2 text-xs font-semibold text-white/50">
                  {r.items[0]?.dateTime
                    ? new Date(r.items[0].dateTime).toLocaleDateString("en-AU", { day: "numeric", month: "short", timeZone: "Australia/Brisbane" })
                    : ""}
                  <span className="transition group-open:rotate-90" aria-hidden>
                    ›
                  </span>
                </span>
              </summary>
              <ul className="space-y-1 pb-3">
                {r.items.map((m) => {
                  const isCurrent = m.fixtureId === currentFixtureId;
                  const played = m.homeScore != null && m.awayScore != null;
                  return (
                    <li key={m.fixtureId}>
                      <Link
                        href={`/competitions/matches/${encodeURIComponent(m.fixtureId)}`}
                        aria-current={isCurrent ? "page" : undefined}
                        className={`grid grid-cols-[1fr_auto] items-center gap-2 rounded-xl px-3 py-2 text-sm transition ${
                          isCurrent ? "bg-yellow-300/20 ring-1 ring-yellow-300/60" : "hover:bg-white/10"
                        }`}
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-semibold">{m.homeTeam}</span>
                          <span className="block truncate font-semibold text-white/80">{m.awayTeam}</span>
                        </span>
                        <span className="text-right tabular-nums">
                          {played ? (
                            <>
                              <span className="block font-black">{m.homeScore}</span>
                              <span className="block font-black text-white/80">{m.awayScore}</span>
                            </>
                          ) : (
                            <span className="text-xs text-white/60">
                              {m.dateTime
                                ? new Date(m.dateTime).toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit", timeZone: "Australia/Brisbane" })
                                : "TBC"}
                            </span>
                          )}
                          {m.shootout && <span className="block text-[10px] font-bold text-yellow-200">SO {m.shootout}</span>}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </details>
          ))}
      </div>
    </aside>
  );
}

function Chevron() {
  return (
    <svg className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/70" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z" />
    </svg>
  );
}
