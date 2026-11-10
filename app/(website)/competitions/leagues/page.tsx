import type { ReactNode } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { listPublicLeagues } from "@/lib/public/publicLeagues";
import {
  LEAGUE_FILTER_KEYS,
  applyLeagueFilters,
  buildFilterOptions,
  hasActiveFilters,
  leaguesHref,
  leaguesHrefWith,
  parseLeagueFilters,
  type LeagueFilterKey,
  type LeagueFilters,
} from "@/lib/public/leagueFilters";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "League competitions | Hockey",
  description:
    "Browse published city and regional league competitions by season — fixtures, standings, and results.",
};

const FILTER_LABELS: Record<LeagueFilterKey, string> = {
  season: "Season",
  country: "Country",
  state: "State",
  sport: "Sport",
};

export default async function PublicLeaguesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = parseLeagueFilters(await searchParams);
  const all = await listPublicLeagues();
  const filtered = applyLeagueFilters(all, filters);
  const options = buildFilterOptions(all, filters);
  const active = hasActiveFilters(filters);

  // A facet is only worth showing when it can change the result: 2+ choices, or a
  // selection that needs to stay clearable.
  const visibleKeys = LEAGUE_FILTER_KEYS.filter(
    (k) => options[k].length >= 2 || Boolean(filters[k]),
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#06054e] via-slate-900 to-slate-800 px-4 pb-16 pt-8 md:px-8">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/competitions"
          className="mb-6 inline-flex text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white"
        >
          ← Match Day Central
        </Link>
        <h1 className="text-3xl font-black uppercase italic tracking-tight text-yellow-200 sm:text-4xl">
          League competitions
        </h1>
        <p className="mt-2 max-w-xl text-sm text-white/70">
          Open competitions for the current and recent seasons. Narrow by season or location, then
          open the hub for fixtures and standings.
        </p>

        {visibleKeys.length > 0 && (
          <nav aria-label="Filter leagues" className="mt-8 space-y-4">
            {visibleKeys.map((key) => (
              <FilterGroup key={key} label={FILTER_LABELS[key]}>
                <FilterChip href={leaguesHrefWith(filters, key, null)} active={!filters[key]}>
                  All
                </FilterChip>
                {options[key].map((o) => (
                  <FilterChip
                    key={o.value}
                    href={leaguesHrefWith(filters, key, o.value)}
                    active={filters[key]?.toLowerCase() === o.value.toLowerCase()}
                  >
                    {o.value}
                    <span className="ml-1.5 font-bold opacity-60">{o.count}</span>
                  </FilterChip>
                ))}
              </FilterGroup>
            ))}
          </nav>
        )}

        <p className="mt-6 text-[11px] text-white/50" aria-live="polite">
          Showing {filtered.length} of {all.length} league{all.length === 1 ? "" : "s"}
          {active && (
            <>
              {" · "}
              <Link href={leaguesHref({})} className="font-black text-yellow-200 hover:underline">
                Clear filters
              </Link>
            </>
          )}
        </p>

        <ul className="mt-4 space-y-3">
          {filtered.length === 0 ? (
            <li className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/60">
              <EmptyState noLeaguesAtAll={all.length === 0} filters={filters} />
            </li>
          ) : (
            filtered.map((l) => {
              const place = [l.state, l.country].filter(Boolean).join(", ");
              return (
                <li key={l.seasonCompetitionId}>
                  <Link
                    href={`/competitions/leagues/${l.seasonCompetitionId}`}
                    className="block rounded-2xl border border-white/10 bg-[#06054e]/80 p-4 transition-colors hover:border-yellow-400/40 hover:bg-[#06054e]"
                  >
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <span className="text-lg font-bold text-white">
                        {l.competitionName ?? l.competitionId}{" "}
                        <span className="text-yellow-200">{l.season}</span>
                      </span>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        {l.status.replace("_", " ")}
                      </span>
                    </div>
                    {place && (
                      <p className="mt-1 text-[11px] font-bold uppercase tracking-widest text-white/50">
                        {place}
                      </p>
                    )}
                    <p className="mt-1 font-mono text-[11px] text-white/40">
                      {l.seasonCompetitionId}
                    </p>
                  </Link>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </div>
  );
}

function EmptyState({
  noLeaguesAtAll,
  filters,
}: {
  noLeaguesAtAll: boolean;
  filters: LeagueFilters;
}) {
  if (noLeaguesAtAll) {
    return (
      <>
        No published leagues yet. Run{" "}
        <code className="rounded bg-black/30 px-1.5 py-0.5 text-xs text-amber-200">
          npm run seed:public-demo
        </code>{" "}
        locally to load sample 2025 / 2026 data.
      </>
    );
  }
  return (
    <>
      No leagues match these filters.{" "}
      {hasActiveFilters(filters) && (
        <Link href={leaguesHref({})} className="font-black text-yellow-200 hover:underline">
          Clear filters
        </Link>
      )}
    </>
  );
}

function FilterGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div role="group" aria-label={label}>
      <div className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
        {label}
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function FilterChip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={`rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-colors ${
        active
          ? "bg-yellow-400 text-[#06054e]"
          : "border border-white/20 bg-white/5 text-white/80 hover:bg-white/10"
      }`}
    >
      {children}
    </Link>
  );
}
