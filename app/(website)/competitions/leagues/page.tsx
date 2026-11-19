import Link from "next/link";
import type { Metadata } from "next";
import { listPublicLeagues } from "@/lib/public/publicLeagues";
import LeagueFilterBar, { type LeagueFilterField } from "@/components/competitions/LeagueFilterBar";
import { defaultYear } from "@/lib/competitions/fixtureView";
import {
  applyLeagueFilters,
  buildFilterOptions,
  hasActiveFilters,
  leaguesHref,
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
  const sp = await searchParams;
  const parsed = parseLeagueFilters(sp);
  const all = await listPublicLeagues();

  // Opens on the current year (or the next one with leagues, else the latest); "All years" is season=all.
  const seasons = [...new Set(all.map((l) => l.season))];
  const filters: LeagueFilters = { ...parsed };
  if (sp.season === undefined && seasons.length) filters.season = defaultYear(seasons, new Date());
  if (filters.season?.toLowerCase() === "all") delete filters.season;

  const options = buildFilterOptions(all, filters);
  const nameOf = (l: { competitionName: string | null; competitionId: string }) => l.competitionName ?? l.competitionId;
  // Competition choices come from the leagues that match the other filters; a competition that isn't there is ignored.
  const byOthers = applyLeagueFilters(all, filters);
  const competitionOptions = [...new Set(byOthers.map(nameOf))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const wantedComp = typeof sp.competition === "string" ? sp.competition : "";
  const competition = competitionOptions.includes(wantedComp) ? wantedComp : "";
  const filtered = byOthers.filter((l) => !competition || nameOf(l) === competition);
  const active = hasActiveFilters(filters) || Boolean(competition);

  const fields: LeagueFilterField[] = [
    { key: "season", label: "Year", value: filters.season ?? "all", allLabel: "All years", options: options.season.map((o) => ({ value: o.value, label: o.value })) },
    { key: "competition", label: "Competition", value: competition, allLabel: "All competitions", options: competitionOptions.map((n) => ({ value: n, label: n })) },
    ...(["country", "state", "sport"] as const)
      .filter((k) => options[k].length >= 2 || Boolean(filters[k]))
      .map((k) => ({ key: k, label: FILTER_LABELS[k], value: filters[k] ?? "all", allLabel: `All ${FILTER_LABELS[k].toLowerCase()}s`.replace("countrys", "countries"), options: options[k].map((o) => ({ value: o.value, label: o.value })) })),
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#06054e] via-slate-900 to-slate-800 px-4 pb-16 pt-8 md:px-8 lg:px-12">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/competitions"
          className="mb-6 inline-flex text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white"
        >
          ← Match Centre
        </Link>
        <h1 className="text-3xl font-black uppercase italic tracking-tight text-yellow-200 sm:text-4xl">
          League competitions
        </h1>
        <p className="mt-2 max-w-xl text-sm text-white/70">
          Open competitions for the current and upcoming seasons. Narrow by year, competition or location, then
          open the hub for fixtures and standings.
        </p>

        <div className="mt-8">
          <LeagueFilterBar fields={fields} />
        </div>

        <p className="mt-6 text-[11px] text-white/50" aria-live="polite">
          Showing {filtered.length} of {all.length} league{all.length === 1 ? "" : "s"}
          {active && (
            <>
              {" · "}
              <Link href="/competitions/leagues?season=all" className="font-black text-yellow-200 hover:underline">
                Clear filters
              </Link>
            </>
          )}
        </p>

        <ul className="mt-4 grid gap-3 md:grid-cols-2">
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
