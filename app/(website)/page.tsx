import Image from "next/image";
import Link from "next/link";
import { getUpcomingMatches, getRecentMatches } from "@/lib/data/matches";
import { getCurrentSeasonStandings } from "@/lib/data/standings";
import { getClubs } from "@/lib/data/clubs";
import { getPublicNewsItems } from "@/lib/data/publicNews";
import HomeResultsTicker, {
  type TickerLine,
} from "@/components/website/home/HomeResultsTicker";
import HomeDivisionExplorer from "@/components/website/home/HomeDivisionExplorer";

const GALLERY_PLACEHOLDERS = [
  { title: "Premier division", tone: "from-emerald-600 to-[#06054e]" },
  { title: "Junior finals", tone: "from-amber-500 to-orange-700" },
  { title: "Community day", tone: "from-sky-600 to-indigo-900" },
  { title: "Representative", tone: "from-violet-600 to-[#06054e]" },
];

export default async function HomePage() {
  const [upcomingMatches, recentMatches, divisions, clubs, newsItems] =
    await Promise.all([
      getUpcomingMatches(),
      getRecentMatches(24),
      getCurrentSeasonStandings(),
      getClubs(),
      getPublicNewsItems(5),
    ]);

  const featureMatch = upcomingMatches[0];

  const tickerLines: TickerLine[] = recentMatches.map((m) => {
    const hs = m.score?.home ?? "—";
    const awayScr = m.score?.away ?? "—";
    return {
      key: m.matchId,
      text: `${m.division} · ${m.homeTeam.name} ${hs}–${awayScr} ${m.awayTeam.name}`,
    };
  });

  const divisionExplorerData = divisions.map((d) => ({
    divisionName: d.divisionName,
    slug: d.slug,
    teams: d.teams.map((t) => ({
      club: t.club,
      icon: t.icon,
      pts: t.pts,
    })),
  }));

  const upcomingLite = upcomingMatches.map((m) => ({
    matchId: m.matchId,
    division: m.division,
    dateTime: m.dateTime,
    venue: m.venue,
    homeTeam: { name: m.homeTeam.name, icon: m.homeTeam.icon },
    awayTeam: { name: m.awayTeam.name, icon: m.awayTeam.icon },
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-slate-100">
      <HomeResultsTicker lines={tickerLines} />

      {/* Compact feature strip */}
      {featureMatch && (
        <section className="bg-gradient-to-r from-[#06054e] to-[#12106e] text-white">
          <div className="max-w-7xl mx-auto px-4 py-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-yellow-300/90 mb-1">
                Next feature fixture
              </p>
              <h1 className="text-2xl md:text-3xl font-black uppercase">
                {featureMatch.division}
              </h1>
              <p className="text-sm text-white/75 mt-1">
                {new Date(featureMatch.dateTime).toLocaleString("en-AU", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  hour: "2-digit",
                  minute: "2-digit",
                })}{" "}
                · {featureMatch.venue}
              </p>
              <p className="mt-2 font-bold text-lg">
                {featureMatch.homeTeam.name}{" "}
                <span className="text-white/50 font-black mx-1">v</span>{" "}
                {featureMatch.awayTeam.name}
              </p>
            </div>
            <Link
              href="/competitions/matches"
              className="inline-flex items-center justify-center px-8 py-3 rounded-full bg-yellow-400 text-[#06054e] text-sm font-black uppercase hover:bg-yellow-300 transition-colors shrink-0"
            >
              All fixtures
            </Link>
          </div>
        </section>
      )}

      {/* Gallery strip */}
      <section className="max-w-7xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-black uppercase text-[#06054e]">
            Gallery
          </h2>
          <span className="text-xs text-slate-500">
            Highlights from around the grounds
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {GALLERY_PLACEHOLDERS.map((g) => (
            <div
              key={g.title}
              className={`relative aspect-[4/3] rounded-2xl overflow-hidden bg-gradient-to-br ${g.tone} shadow-md border border-white/20`}
            >
              <div className="absolute inset-0 flex items-end p-4">
                <span className="text-white text-xs font-black uppercase tracking-wide drop-shadow-md">
                  {g.title}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 pb-14">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
          {/* News + sponsors */}
          <div className="xl:col-span-4 space-y-10">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-black uppercase text-[#06054e]">
                  News
                </h2>
                <Link
                  href="/news"
                  className="text-xs font-black uppercase text-slate-500 hover:text-[#06054e]"
                >
                  All news →
                </Link>
              </div>
              {newsItems.length === 0 ? (
                <p className="text-sm text-slate-500 rounded-2xl border border-dashed border-slate-200 p-6">
                  News articles will appear here when published.
                </p>
              ) : (
                <ul className="space-y-3">
                  {newsItems.map((n) => (
                    <li
                      key={n.id}
                      className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm"
                    >
                      <h3 className="font-black text-slate-900 text-sm leading-snug">
                        {n.title}
                      </h3>
                      {n.publishDate && (
                        <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold">
                          {n.publishDate.toLocaleDateString("en-AU")}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h2 className="text-xl font-black uppercase text-[#06054e] mb-4">
                Sponsors
              </h2>
              <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/80 p-8 text-center">
                <p className="text-sm font-bold text-slate-500">
                  Partner logos and sponsor messaging will be shown here.
                </p>
                <p className="text-xs text-slate-400 mt-2">
                  Contact the association to support local hockey.
                </p>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-black uppercase text-[#06054e]">
                  Clubs
                </h2>
                <Link
                  href="/clubs"
                  className="text-xs font-black uppercase text-slate-500 hover:text-[#06054e]"
                >
                  Directory →
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {clubs.slice(0, 4).map((club) => (
                  <Link
                    key={club.slug}
                    href={`/clubs/${club.slug}`}
                    className="bg-white rounded-2xl p-4 border border-slate-200 hover:shadow-md transition-shadow text-center"
                  >
                    <div className="relative w-12 h-12 mx-auto mb-2">
                      {club.logo || club.iconSrc ? (
                        <Image
                          src={(club.logo || club.iconSrc) as string}
                          alt=""
                          fill
                          className="object-contain"
                        />
                      ) : (
                        <span className="text-2xl" aria-hidden>
                          {club.icon ?? "🏑"}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] font-black uppercase text-slate-800 truncate">
                      {club.shortName || club.name || club.title || "Club"}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Division fixtures + ladder */}
          <div className="xl:col-span-8 rounded-3xl bg-white border border-slate-200 shadow-sm p-6 md:p-8">
            <HomeDivisionExplorer
              divisions={divisionExplorerData}
              upcoming={upcomingLite}
            />
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-r from-[#06054e] to-[#0a0870] text-white py-14">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-black uppercase mb-3">
            Join Brisbane Hockey
          </h2>
          <p className="text-white/80 mb-8 max-w-xl mx-auto text-sm">
            Find a club, follow your division, and get involved as a player,
            coach, or volunteer.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              href="/clubs"
              className="px-6 py-3 bg-yellow-400 text-[#06054e] rounded-full font-black uppercase text-xs hover:bg-yellow-300"
            >
              Find a club
            </Link>
            <Link
              href="/competitions/leagues"
              className="px-6 py-3 border-2 border-white/80 rounded-full font-black uppercase text-xs hover:bg-white/10"
            >
              Leagues
            </Link>
            <Link
              href="/tournaments"
              className="px-6 py-3 border-2 border-white/80 rounded-full font-black uppercase text-xs hover:bg-white/10"
            >
              Tournaments
            </Link>
            <Link
              href="/representative"
              className="px-6 py-3 border-2 border-white/80 rounded-full font-black uppercase text-xs hover:bg-white/10"
            >
              Representative
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
