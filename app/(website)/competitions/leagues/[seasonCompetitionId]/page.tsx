import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getPublicLeagueById,
} from "@/lib/public/publicLeagues";
import { getPublicAssociationById } from "@/lib/public/publicAssociation";
import { associationPortalHomeUrl } from "@/lib/tenant/subdomainUrls";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ seasonCompetitionId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { seasonCompetitionId } = await params;
  const league = await getPublicLeagueById(seasonCompetitionId);
  if (!league) {
    return { title: "Competition not found" };
  }
  const title = `${league.competitionName ?? league.competitionId} ${league.season} | League hub`;
  return {
    title,
    description: `Fixtures, standings, and statistics for ${league.competitionName ?? league.competitionId} (${league.season}).`,
    openGraph: { title },
  };
}

export default async function LeagueHubPage({ params }: Props) {
  const { seasonCompetitionId } = await params;
  const league = await getPublicLeagueById(seasonCompetitionId);
  if (!league) notFound();

  const assoc = await getPublicAssociationById(league.owningAssociationId);

  const q = `seasonCompetitionId=${encodeURIComponent(seasonCompetitionId)}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#06054e] via-slate-900 to-slate-800 px-4 pb-20 pt-8 md:px-8">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/competitions/leagues"
          className="mb-6 inline-flex text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white"
        >
          ← All leagues
        </Link>

        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-yellow-200">
          Season {league.season}
        </p>
        <h1 className="mt-2 text-3xl font-black uppercase italic tracking-tight text-white sm:text-4xl">
          {league.competitionName ?? league.competitionId}
        </h1>
        {assoc && (
          <p className="mt-2 text-sm text-white/70">
            <Link
              href={associationPortalHomeUrl({ code: assoc.code })}
              className="underline decoration-white/30 underline-offset-4 hover:text-white"
            >
              {assoc.name}
            </Link>
          </p>
        )}

        <div className="mt-10 grid gap-3 sm:grid-cols-2">
          <HubCard
            href={`/competitions/this-round?${q}`}
            title="This round"
            subtitle="This week / round selector"
          />
          <HubCard
            href={`/competitions/matches?${q}`}
            title="Fixtures & results"
            subtitle="Rounds, venues, scores"
          />
          <HubCard
            href={`/competitions/standings?${q}`}
            title="Standings"
            subtitle="Ladder & tie-breakers"
          />
          <HubCard
            href={`/competitions/statistics?year=${encodeURIComponent(league.season)}`}
            title="Statistics"
            subtitle="Leaders & team totals"
          />
          <HubCard href="/competitions" title="Match Day Central" subtitle="All competition tools" />
        </div>

        {league.divisions.length > 0 && (
          <div className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-4">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Divisions
            </h2>
            <ul className="mt-2 space-y-1 text-sm text-white/90">
              {league.divisions.map((d) => (
                <li key={String(d.divisionId ?? d.name)}>
                  {d.name ?? d.divisionId}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function HubCard({
  href,
  title,
  subtitle,
}: {
  href: string;
  title: string;
  subtitle: string;
}) {
  return (
    <Link
      href={href}
      className="block rounded-2xl border border-white/10 bg-[#06054e]/90 p-5 shadow-lg transition-transform active:scale-[0.99] sm:hover:-translate-y-0.5 sm:hover:border-yellow-400/30"
    >
      <h2 className="text-lg font-bold text-white">{title}</h2>
      <p className="mt-1 text-xs text-white/55">{subtitle}</p>
      <span className="mt-3 inline-block text-[10px] font-black uppercase tracking-widest text-yellow-200">
        Open →
      </span>
    </Link>
  );
}
