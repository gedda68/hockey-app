import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Award, BarChart3, CalendarDays, LayoutGrid, ListOrdered, type LucideIcon } from "lucide-react";
import LeagueSwitcher from "@/components/competitions/LeagueSwitcher";
import {
  getPublicLeagueById,
  listPublicLeagues,
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

  const all = await listPublicLeagues();
  const switcher = all.map((l) => ({ id: l.seasonCompetitionId, season: l.season, name: l.competitionName ?? l.competitionId }));
  const assoc = await getPublicAssociationById(league.owningAssociationId);

  const q = `seasonCompetitionId=${encodeURIComponent(seasonCompetitionId)}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#06054e] via-slate-900 to-slate-800 px-4 pb-20 pt-8 md:px-8 lg:px-12">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/competitions/leagues"
          className="mb-6 inline-flex text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white"
        >
          ← All leagues
        </Link>

        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
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
          </div>
          <div className="w-full sm:w-96">
            <LeagueSwitcher leagues={switcher} currentId={seasonCompetitionId} />
          </div>
        </div>

        <div className="mt-8 grid gap-6">
          <div className="grid gap-3">
            <HubCard href={`/competitions/matches?${q}`} icon={CalendarDays} title="Matches" subtitle="Next round, fixtures, results" />
            <HubCard href={`/competitions/standings?${q}`} icon={ListOrdered} title="Standings" subtitle="Ladder & tie-breakers" />
            <HubCard
              href={`/competitions/statistics?${q}`}
              icon={BarChart3} title="Statistics"
              subtitle="Leaders & team totals"
            />
            <HubCard href={`/competitions/awards?${q}`} icon={Award} title="Awards" subtitle="Player of the match & season honours" />
            <HubCard href="/competitions" icon={LayoutGrid} title="Match Centre" subtitle="All competition tools" />
          </div>

        </div>
      </div>
    </div>
  );
}

function HubCard({ href, title, subtitle, icon: Icon }: { href: string; title: string; subtitle: string; icon: LucideIcon }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-4 rounded-2xl border border-white/10 bg-[#06054e]/90 px-5 py-4 shadow-lg transition-transform active:scale-[0.99] sm:hover:border-yellow-400/30"
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-yellow-200/10 text-yellow-200">
        <Icon className="h-6 w-6" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="text-lg font-bold text-white">{title}</h2>
        <p className="mt-1 text-xs text-white/55">{subtitle}</p>
      </div>
      <span className="shrink-0 text-[10px] font-black uppercase tracking-widest text-yellow-200">Open →</span>
    </Link>
  );
}
