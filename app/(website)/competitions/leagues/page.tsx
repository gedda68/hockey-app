import type { ReactNode } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { listPublicLeagues } from "@/lib/public/publicLeagues";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "League competitions | Hockey",
  description:
    "Browse published city and regional league competitions by season — fixtures, standings, and results.",
};

export default async function PublicLeaguesPage({
  searchParams,
}: {
  searchParams: Promise<{ season?: string }>;
}) {
  const { season: seasonFilter } = await searchParams;
  const all = await listPublicLeagues();
  const seasons = Array.from(new Set(all.map((l) => l.season).filter(Boolean))).sort(
    (a, b) => b.localeCompare(a),
  );
  const filtered = seasonFilter
    ? all.filter((l) => l.season === seasonFilter)
    : all;

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
          Open competitions for the current and recent seasons. Pick a season, then open the hub for
          fixtures and standings.
        </p>

        <div className="mt-8 flex flex-wrap gap-2">
          <FilterChip href="/competitions/leagues" active={!seasonFilter}>
            All seasons
          </FilterChip>
          {seasons.map((s) => (
            <FilterChip
              key={s}
              href={`/competitions/leagues?season=${encodeURIComponent(s)}`}
              active={seasonFilter === s}
            >
              {s}
            </FilterChip>
          ))}
        </div>

        <ul className="mt-10 space-y-3">
          {filtered.length === 0 ? (
            <li className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/60">
              No published leagues match this filter. Run{" "}
              <code className="rounded bg-black/30 px-1.5 py-0.5 text-xs text-amber-200">
                npm run seed:public-demo
              </code>{" "}
              locally to load sample 2025 / 2026 data.
            </li>
          ) : (
            filtered.map((l) => (
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
                  <p className="mt-1 font-mono text-[11px] text-white/40">
                    {l.seasonCompetitionId}
                  </p>
                </Link>
              </li>
            ))
          )}
        </ul>
      </div>
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
