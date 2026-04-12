import type { ReactNode } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { listPublicTournaments } from "@/lib/public/publicTournaments";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Representative tournaments | Hockey",
  description:
    "Browse representative and championship tournaments — draws, fixtures, and results.",
};

export default async function TournamentsDirectoryPage({
  searchParams,
}: {
  searchParams: Promise<{ season?: string }>;
}) {
  const { season: seasonFilter } = await searchParams;
  const all = await listPublicTournaments({ limit: 200 });
  const seasons = Array.from(new Set(all.map((t) => t.season).filter(Boolean))).sort(
    (a, b) => b.localeCompare(a),
  );
  const filtered = seasonFilter
    ? all.filter((t) => t.season === seasonFilter)
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
        <h1 className="text-3xl font-black uppercase italic tracking-tight text-sky-200 sm:text-4xl">
          Tournaments
        </h1>
        <p className="mt-2 max-w-xl text-sm text-white/70">
          Championship and representative events. Open a tournament for the public draw and fixture
          list.
        </p>

        <div className="mt-8 flex flex-wrap gap-2">
          <FilterChip href="/tournaments" active={!seasonFilter}>
            All seasons
          </FilterChip>
          {seasons.map((s) => (
            <FilterChip
              key={s}
              href={`/tournaments?season=${encodeURIComponent(s)}`}
              active={seasonFilter === s}
            >
              {s}
            </FilterChip>
          ))}
        </div>

        <ul className="mt-10 space-y-3">
          {filtered.length === 0 ? (
            <li className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/60">
              No tournaments in the database for this filter. Run{" "}
              <code className="rounded bg-black/30 px-1.5 py-0.5 text-xs text-amber-200">
                npm run seed:public-demo
              </code>{" "}
              to add sample 2025 / 2026 events.
            </li>
          ) : (
            filtered.map((t) => (
              <li key={t.tournamentId}>
                <Link
                  href={`/tournaments/${t.tournamentId}`}
                  className="block rounded-2xl border border-white/10 bg-[#06054e]/80 p-4 transition-colors hover:border-sky-400/40"
                >
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <span className="text-lg font-bold text-white">{t.title}</span>
                      <p className="mt-1 text-xs text-white/55">
                        {t.season} · {t.ageGroup} ({t.gender}) · {t.location}
                      </p>
                      <p className="mt-1 font-mono text-[11px] text-white/35">{t.tournamentId}</p>
                    </div>
                    {t.championTeamName && (
                      <span className="mt-2 shrink-0 rounded-full bg-yellow-400/20 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-yellow-200 sm:mt-0">
                        Champion: {t.championTeamName}
                      </span>
                    )}
                  </div>
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
          ? "bg-sky-400 text-[#06054e]"
          : "border border-white/20 bg-white/5 text-white/80 hover:bg-white/10"
      }`}
    >
      {children}
    </Link>
  );
}
