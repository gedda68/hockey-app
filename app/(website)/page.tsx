import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";
import {
  Trophy,
  Users,
  Calendar,
  MapPin,
  BarChart3,
  Shield,
} from "lucide-react";
import { getUpcomingMatches, getRecentMatches } from "@/lib/data/matches";
import { getCurrentSeasonStandings } from "@/lib/data/standings";
import { getClubs } from "@/lib/data/clubs";
import { getPublicNewsItems } from "@/lib/data/publicNews";
import clientPromise from "@/lib/mongodb";
import {
  resolvePortalSlugForRequest,
  resolveTenantByPortalSlug,
  type PublicTenantPayload,
} from "@/lib/tenant/portalHost";
import { clubPortalHomeUrl } from "@/lib/tenant/subdomainUrls";
import ClubSiteShell from "@/components/clubs/ClubSiteShell";
import ClubSiteDashboard from "@/components/clubs/ClubSiteDashboard";
import HomeResultsTicker, {
  type TickerLine,
} from "@/components/website/home/HomeResultsTicker";
import HomeDivisionExplorer from "@/components/website/home/HomeDivisionExplorer";
import HomeNewsAside from "@/components/website/home/HomeNewsAside";
import HomeHeroGallery from "@/components/website/home/HomeHeroGallery";
import { getRandomHomeGallerySlides } from "@/lib/data/homeGallery";

const QUICK_LINKS = [
  {
    href: "/competitions/matches",
    label: "Fixtures",
    icon: Trophy,
    desc: "All divisions",
  },
  {
    href: "/representative",
    label: "Representative",
    icon: Users,
    desc: "Teams & rosters",
  },
  {
    href: "/competitions/events",
    label: "Events",
    icon: Calendar,
    desc: "Calendar",
  },
  {
    href: "/competitions/standings",
    label: "Standings",
    icon: BarChart3,
    desc: "Full ladder",
  },
  {
    href: "/clubs",
    label: "Clubs",
    icon: MapPin,
    desc: "Directory",
  },
  {
    href: "/login",
    label: "Portal login",
    icon: Shield,
    desc: "Admin & members",
  },
] as const;

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const headersList = await headers();
  const host =
    headersList.get("x-forwarded-host") ?? headersList.get("host") ?? "";
  const queryPortal = typeof sp.portal === "string" ? sp.portal : null;
  const portal = resolvePortalSlugForRequest(host, queryPortal);

  let associationPortal: PublicTenantPayload | null = null;

  if (portal) {
    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || "hockey-app");
    const tenant = await resolveTenantByPortalSlug(db, portal);
    if (tenant?.kind === "association") {
      associationPortal = tenant;
    }

    if (tenant?.kind === "club" && tenant.pathSlug) {
      const base = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
      const res = await fetch(
        `${base}/api/clubs/${encodeURIComponent(tenant.pathSlug)}`,
        { cache: "no-store" },
      );
      const club = res.ok ? await res.json() : null;
      if (club) {
        const routeSlug = (club.slug as string) || tenant.pathSlug;
        return (
          <ClubSiteShell club={club} routeSlug={routeSlug}>
            <ClubSiteDashboard clubId={routeSlug} />
          </ClubSiteShell>
        );
      }
    }
  }

  const [upcomingMatches, recentMatches, divisions, clubs, newsItems, gallerySlides] =
    await Promise.all([
      getUpcomingMatches(),
      getRecentMatches(24),
      getCurrentSeasonStandings(),
      getClubs(),
      getPublicNewsItems(8),
      getRandomHomeGallerySlides(7),
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

  const newsForAside = newsItems.map((n) => ({
    id: n.id,
    title: n.title,
    content: n.content,
    publishDate: n.publishDate?.toISOString(),
    image: n.image,
    imageUrl: n.imageUrl,
    author: n.author,
  }));

  const assocHome = associationPortal != null;
  const assocBgStyle = associationPortal
    ? {
        background: `linear-gradient(to bottom right, ${associationPortal.primaryColor}, color-mix(in srgb, ${associationPortal.primaryColor} 75%, white 25%))`,
      }
    : undefined;

  return (
    <div
      className={
        assocHome
          ? "min-h-screen"
          : "min-h-screen bg-gradient-to-br from-slate-100 via-white to-slate-100"
      }
      style={assocBgStyle}
    >
      <HomeResultsTicker lines={tickerLines} />

      <div className="max-w-7xl mx-auto px-4 py-8 lg:py-10">
        <div className="flex flex-col lg:flex-row lg:items-start gap-8 lg:gap-10">
          {/* Sidebar: news, sponsors, clubs */}
          <div className="w-full lg:w-80 shrink-0 order-2 lg:order-1">
            <div className="space-y-8 lg:sticky lg:top-24">
            <HomeNewsAside items={newsForAside} />

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-black uppercase text-[#06054e] mb-4">
                Sponsors
              </h2>
              <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-6 text-center">
                <p className="text-sm font-bold text-slate-500">
                  Partner logos and sponsor messaging will be added here.
                </p>
                <p className="text-xs text-slate-400 mt-2">
                  Contact the association to support local hockey.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-black uppercase text-[#06054e]">
                  Clubs
                </h2>
                <Link
                  href="/clubs"
                  className="text-[10px] font-black uppercase text-slate-500 hover:text-[#06054e]"
                >
                  Directory →
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {clubs.slice(0, 4).map((club) => (
                  <Link
                    key={club.slug}
                    href={clubPortalHomeUrl({
                      shortName: club.shortName,
                      abbreviation: club.abbreviation,
                      slug: club.slug,
                    })}
                    className="rounded-xl border border-slate-100 p-3 text-center hover:border-[#06054e]/25 hover:shadow-sm transition-all"
                  >
                    <div className="relative w-10 h-10 mx-auto mb-2">
                      {club.logo || club.iconSrc ? (
                        <Image
                          src={(club.logo || club.iconSrc) as string}
                          alt=""
                          fill
                          className="object-contain"
                        />
                      ) : (
                        <span className="text-xl" aria-hidden>
                          {club.icon ?? "🏑"}
                        </span>
                      )}
                    </div>
                    <div className="text-[9px] font-black uppercase text-slate-800 truncate">
                      {club.shortName || club.name || club.title || "Club"}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
            </div>
          </div>

          {/* Main column */}
          <div className="flex-1 min-w-0 space-y-10 order-1 lg:order-2">
            <div className="text-center lg:text-left">
              <h1
                className={`text-3xl md:text-4xl font-black uppercase tracking-tight ${assocHome ? "text-white" : "text-[#06054e]"}`}
              >
                Hockey management
                <span className="text-yellow-500"> made simple</span>
              </h1>
              <p
                className={`mt-3 font-semibold text-sm md:text-base max-w-2xl mx-auto lg:mx-0 ${assocHome ? "text-white/80" : "text-slate-600"}`}
              >
                Fixtures, standings, news, and club links for Brisbane Hockey —
                all in one place.
              </p>
            </div>

            {featureMatch && (
              <section className="rounded-3xl bg-gradient-to-r from-[#06054e] to-[#12106e] text-white p-6 md:p-8 shadow-lg">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-yellow-300/90 mb-1">
                      Next feature fixture
                    </p>
                    <p className="text-xl md:text-2xl font-black uppercase">
                      {featureMatch.division}
                    </p>
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
                    <p className="mt-2 font-bold">
                      {featureMatch.homeTeam.name}{" "}
                      <span className="text-white/50 font-black mx-1">v</span>{" "}
                      {featureMatch.awayTeam.name}
                    </p>
                  </div>
                  <Link
                    href="/competitions/matches"
                    className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-yellow-400 text-[#06054e] text-xs font-black uppercase hover:bg-yellow-300 transition-colors shrink-0"
                  >
                    All fixtures
                  </Link>
                </div>
              </section>
            )}

            <section>
              <div className="flex items-center justify-between mb-4">
                <h2
                  className={`text-xl font-black uppercase ${assocHome ? "text-white" : "text-[#06054e]"}`}
                >
                  Gallery
                </h2>
                <span
                  className={`text-xs hidden sm:inline ${assocHome ? "text-white/55" : "text-slate-500"}`}
                >
                  Tap a thumbnail or wait — slides advance automatically
                </span>
              </div>
              <HomeHeroGallery slides={gallerySlides} autoAdvanceMs={6500} />
            </section>

            <section>
              <h2
                className={`text-xl font-black uppercase mb-4 ${assocHome ? "text-white" : "text-[#06054e]"}`}
              >
                Quick links
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {QUICK_LINKS.map(({ href, label, desc, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-[#06054e]/20 hover:shadow transition-all"
                  >
                    <div className="w-10 h-10 rounded-xl bg-yellow-400 flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-[#06054e]" />
                    </div>
                    <div className="min-w-0 text-left">
                      <div className="font-black text-sm text-slate-900 uppercase truncate">
                        {label}
                      </div>
                      <div className="text-[10px] text-slate-500 font-bold mt-0.5">
                        {desc}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>

            <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6 md:p-8">
              <HomeDivisionExplorer
                divisions={divisionExplorerData}
                upcoming={upcomingLite}
              />
            </section>
          </div>
        </div>
      </div>

      <section className="bg-gradient-to-r from-[#06054e] to-[#0a0870] text-white py-14 mt-4">
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
