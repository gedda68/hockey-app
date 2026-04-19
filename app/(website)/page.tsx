import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";
import {
  Trophy,
  Users,
  UserPlus,
  Calendar,
  MapPin,
  BarChart3,
  Shield,
} from "lucide-react";
import { getUpcomingMatches } from "@/lib/data/matches";
import { getCurrentSeasonStandings } from "@/lib/data/standings";
import { getClubs } from "@/lib/data/clubs";
import { getPublicNewsItems } from "@/lib/data/publicNews";
import clientPromise, { isMongoConnectionError } from "@/lib/mongodb";
import {
  isLocalDevHostname,
  resolvePortalSlugForRequest,
  resolveTenantByPortalSlug,
  type PublicTenantPayload,
} from "@/lib/tenant/portalHost";
import { clubPortalHomeUrl } from "@/lib/tenant/subdomainUrls";
import ClubSiteShell from "@/components/clubs/ClubSiteShell";
import ClubSiteDashboard from "@/components/clubs/ClubSiteDashboard";
import HomeDivisionExplorer from "@/components/website/home/HomeDivisionExplorer";
import HomeNewsAside from "@/components/website/home/HomeNewsAside";
import HomeHeroGallery from "@/components/website/home/HomeHeroGallery";
import { getRandomHomeGallerySlides } from "@/lib/data/homeGallery";
import { listPublicClubsByAssociation } from "@/lib/public/publicClubs";
import { buildPathwaysCards } from "@/lib/website/pathwaysCards";
import PathwaysGrid from "@/components/website/pathways/PathwaysGrid";
import PartnerStripClickable from "@/components/website/PartnerStripClickable";
import {
  absolutizeOpenGraphUrl,
  canonicalFromPath,
} from "@/lib/seo/absolutizeMediaUrl";
import { resolveTenantFaviconUrl } from "@/lib/tenant/resolveTenantFavicon";
import { getPublicTenantForServerPage } from "@/lib/tenant/serverTenant";
import { requestMetadataBase } from "@/lib/tenant/requestMetadataBase";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const sp = await searchParams;
  const tenant = await getPublicTenantForServerPage(sp);
  const metadataBase = await requestMetadataBase();
  const canonical = canonicalFromPath("/", metadataBase);
  const siteLabel =
    tenant?.displayName ?? "Brisbane Hockey Association";
  const description = `${siteLabel} — fixtures, results, and club information.`;

  let ogImage: string | undefined;
  if (tenant) {
    const fav = resolveTenantFaviconUrl(tenant);
    ogImage = absolutizeOpenGraphUrl(fav, metadataBase);
  }
  if (!ogImage) {
    ogImage = new URL("/icons/BHA-bg.png", metadataBase).href;
  }

  return {
    alternates: { canonical },
    openGraph: {
      type: "website",
      url: canonical,
      title: siteLabel,
      description,
      images: [{ url: ogImage, alt: siteLabel }],
    },
    twitter: {
      card: "summary_large_image",
      title: siteLabel,
      description,
      images: [ogImage],
    },
  };
}

function hexToRgba(hex: string, alpha: number): string | null {
  const h = hex.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const a = Math.max(0, Math.min(1, alpha));
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

function tenantPrimaryGradient(primary: string, endAlpha = 0.75): string {
  const hex = String(primary ?? "").trim();
  const h = hex.replace(/^#/, "");
  const tail =
    /^[0-9a-fA-F]{6}$/.test(h) ? hexToRgba(`#${h}`, endAlpha) ?? hex : hex;
  return `linear-gradient(to bottom right, ${hex}, ${tail})`;
}

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
  {
    href: "/play",
    label: "Get involved",
    icon: UserPlus,
    desc: "Play · coach · umpire",
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
    try {
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
    } catch (e) {
      if (isMongoConnectionError(e)) {
        console.error(
          "[HomePage] MongoDB unavailable while resolving portal; continuing as apex.",
          e instanceof Error ? e.message : e,
        );
      } else {
        throw e;
      }
    }
  }

  const associationId = associationPortal?.id;

  const tenantClubRows = associationId
    ? await listPublicClubsByAssociation(associationId, { limit: 24 })
    : [];

  const jsonClubs = await getClubs();
  const gallerySlides = await getRandomHomeGallerySlides(7, associationPortal);

  let upcomingMatches: Awaited<ReturnType<typeof getUpcomingMatches>> = [];
  let divisions: Awaited<ReturnType<typeof getCurrentSeasonStandings>> = [];
  let newsItems: Awaited<ReturnType<typeof getPublicNewsItems>> = [];

  try {
    [upcomingMatches, divisions, newsItems] = await Promise.all([
      getUpcomingMatches(
        associationId ? { owningAssociationId: associationId } : undefined,
      ),
      getCurrentSeasonStandings(),
      getPublicNewsItems(8, associationPortal),
    ]);
  } catch (e) {
    if (isMongoConnectionError(e)) {
      console.error(
        "[HomePage] MongoDB unavailable (fixtures, standings, and news sections are empty).",
        e instanceof Error ? e.message : e,
      );
    } else {
      throw e;
    }
  }

  const clubsForSidebar =
    tenantClubRows.length > 0
      ? tenantClubRows.map((c) => ({
          slug: c.slug,
          shortName: c.shortName,
          name: c.name,
          title: c.name,
          logo: c.logo,
          iconSrc: c.logo,
          icon: undefined as string | undefined,
          abbreviation: undefined as string | undefined,
        }))
      : jsonClubs.slice(0, 4);

  const featureMatch = upcomingMatches[0];

  const clubsDirectoryHref = associationPortal
    ? `/associations/${encodeURIComponent(associationPortal.id)}`
    : "/clubs";

  /** Keep `?portal=` on plain localhost so navigation stays on the same tenant. */
  const queryPortalParam =
    typeof sp.portal === "string" && sp.portal.trim()
      ? sp.portal.trim()
      : null;
  const needsPortalQueryOnLinks = Boolean(
    queryPortalParam && isLocalDevHostname(host),
  );
  function withPortalQuery(path: string): string {
    if (!needsPortalQueryOnLinks || !queryPortalParam) return path;
    if (path.startsWith("http://") || path.startsWith("https://")) return path;
    const [base, frag] = path.split("#");
    const join = base.includes("?") ? "&" : "?";
    const out = `${base}${join}portal=${encodeURIComponent(queryPortalParam)}`;
    return frag ? `${out}#${frag}` : out;
  }

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
    videoUrl: n.videoUrl,
    author: n.author,
  }));

  const assocHome = associationPortal != null;
  const assocBgStyle = associationPortal
    ? {
        background: tenantPrimaryGradient(
          String(associationPortal.primaryColor ?? "#06054e"),
          0.75,
        ),
      }
    : undefined;

  const joinOrgName = associationPortal?.displayName ?? "Brisbane Hockey";

  return (
    <div
      className={
        assocHome
          ? "min-h-screen"
          : "min-h-screen bg-gradient-to-br from-slate-100 via-white to-slate-100"
      }
      style={assocBgStyle}
    >
      {/* Tenant home title + logo (admin: Association → branding logo / colours) */}
      <section className="max-w-7xl mx-auto px-4 pt-6 pb-2 lg:pt-8">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
          {associationPortal?.logo ? (
            <Link href="/" className="shrink-0 block focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 rounded-xl">
              {/* eslint-disable-next-line @next/next/no-img-element -- remote branding */}
              <img
                src={associationPortal.logo}
                alt=""
                className="h-16 sm:h-20 md:h-24 w-auto max-w-[min(380px,88vw)] object-contain object-left rounded-xl bg-white/15 p-2 ring-1 ring-white/25"
              />
            </Link>
          ) : !assocHome ? (
            <Link href="/" className="shrink-0 block">
              <Image
                src="/icons/BHA-bg.png"
                alt="Brisbane Hockey Association"
                width={200}
                height={80}
                className="h-16 sm:h-20 w-auto object-contain object-left"
                priority
              />
            </Link>
          ) : null}
          <div className="min-w-0">
            <p
              className={`text-[10px] font-black uppercase tracking-[0.28em] ${assocHome ? "text-white/75" : "text-slate-500"}`}
            >
              {assocHome ? "Official portal" : "Welcome"}
            </p>
            <h1
              className={`mt-1 text-2xl sm:text-3xl md:text-4xl font-black uppercase tracking-tight ${assocHome ? "text-white" : "text-[#06054e]"}`}
            >
              {associationPortal?.displayName ?? "Brisbane Hockey Association"}
            </h1>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-8 lg:py-10">
        <div className="flex flex-col lg:flex-row lg:items-start gap-8 lg:gap-8">
          {/* Left sidebar: news, sponsors, clubs */}
          <div className="w-full lg:w-72 shrink-0 order-2 lg:order-1">
            <div className="space-y-8 lg:sticky lg:top-24">
            <HomeNewsAside items={newsForAside} />

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-black uppercase text-[#06054e] mb-4">
                Partners &amp; sponsors
              </h2>
              {associationPortal?.partners && associationPortal.partners.length > 0 ? (
                <PartnerStripClickable
                  partners={associationPortal.partners}
                  scopeType="association"
                  scopeId={associationPortal.id}
                  layout="aside"
                  headingClass="text-slate-500"
                  showHeading={false}
                />
              ) : (
                <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-6 text-center">
                  <p className="text-sm font-bold text-slate-500">
                    {associationPortal
                      ? "No partners listed yet for this portal. Add them under Admin → Association → Branding."
                      : "Partner logos appear here on association portals when configured in branding."}
                  </p>
                  <p className="mt-2 text-xs text-slate-400">
                    The site footer also shows the same partner strip on every page.
                  </p>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-black uppercase text-[#06054e]">
                  Clubs
                </h2>
                <Link
                  href={withPortalQuery(clubsDirectoryHref)}
                  className="text-[10px] font-black uppercase text-slate-500 hover:text-[#06054e]"
                >
                  {associationPortal ? "All member clubs →" : "Directory →"}
                </Link>
              </div>
              {clubsForSidebar.length === 0 ? (
                <p className="text-sm font-semibold text-slate-600">
                  {associationPortal
                    ? "No clubs are linked to this association yet. Check back soon, or contact the association office."
                    : "No clubs to show."}
                </p>
              ) : (
              <div className="grid grid-cols-2 gap-3">
                {clubsForSidebar.map((club) => (
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
              )}
            </div>
            </div>
          </div>

          {/* Main column: gallery, feature fixture, explorer */}
          <div className="flex-1 min-w-0 space-y-10 order-1 lg:order-2">
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

            {(featureMatch || assocHome) && (
              <section
                className={`rounded-3xl border-2 p-6 md:p-8 shadow-xl ${
                  assocHome
                    ? "border-white/30 text-white"
                    : "border-transparent bg-gradient-to-r from-[#06054e] to-[#12106e] text-white"
                }`}
                style={
                  assocHome && associationPortal
                    ? {
                        background: `linear-gradient(135deg, ${associationPortal.primaryColor} 0%, ${associationPortal.secondaryColor} 92%)`,
                        boxShadow: "0 18px 40px rgba(0,0,0,0.28)",
                      }
                    : undefined
                }
              >
                {featureMatch ? (
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-yellow-200 mb-1 drop-shadow-sm">
                        Next feature fixture
                      </p>
                      <p className="text-xl md:text-2xl font-black uppercase drop-shadow-sm">
                        {featureMatch.division}
                      </p>
                      <p className="text-sm text-white/90 mt-1">
                        {new Date(featureMatch.dateTime).toLocaleString("en-AU", {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        · {featureMatch.venue}
                      </p>
                      <p className="mt-2 font-bold text-white">
                        {featureMatch.homeTeam.name}{" "}
                        <span className="text-white/60 font-black mx-1">v</span>{" "}
                        {featureMatch.awayTeam.name}
                      </p>
                    </div>
                    <Link
                      href={withPortalQuery("/competitions/matches")}
                      className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-yellow-400 text-[#06054e] text-xs font-black uppercase hover:bg-yellow-300 transition-colors shrink-0 ring-2 ring-black/10"
                    >
                      All fixtures
                    </Link>
                  </div>
                ) : (
                  <p className="text-center text-sm sm:text-base font-bold text-white/95 py-2">
                    No current leagues available.
                  </p>
                )}
              </section>
            )}

            {associationPortal ? (
              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
                <PathwaysGrid
                  cards={buildPathwaysCards(
                    {
                      kind: "association",
                      associationId: associationPortal.id,
                      associationName:
                        associationPortal.displayName ?? "This association",
                    },
                    queryPortalParam && isLocalDevHostname(host)
                      ? queryPortalParam
                      : null,
                  )}
                  variant="light"
                  heading="Get involved"
                  intro="Pathways for this portal: registration, nominations, and role requests use the same tenant context as the rest of the site."
                />
              </section>
            ) : null}

            <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6 md:p-8">
              <HomeDivisionExplorer
                divisions={divisionExplorerData}
                upcoming={upcomingLite}
              />
            </section>
          </div>

          {/* Right sidebar: quick links (tenant paths; ?portal= on apex localhost) */}
          <aside className="w-full lg:w-56 shrink-0 order-3 lg:pl-0">
            <div
              className={`space-y-2 lg:sticky lg:top-24 rounded-2xl p-4 ${
                assocHome
                  ? "border border-white/25 bg-white/10 backdrop-blur-md shadow-lg"
                  : "border border-slate-200 bg-white shadow-sm"
              }`}
            >
              <h2
                className={`text-xs font-black uppercase tracking-[0.2em] mb-3 px-1 ${
                  assocHome ? "text-white/90" : "text-[#06054e]"
                }`}
              >
                Quick links
              </h2>
              <nav className="flex flex-col gap-2" aria-label="Quick links">
                {QUICK_LINKS.map(({ href, label, desc, icon: Icon }) => {
                  const rawHref = href === "/clubs" ? clubsDirectoryHref : href;
                  const linkHref = withPortalQuery(rawHref);
                  return (
                    <Link
                      key={href}
                      href={linkHref}
                      className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all ${
                        assocHome
                          ? "border border-white/20 bg-white/10 text-white hover:bg-white/18"
                          : "border border-slate-100 bg-slate-50/80 hover:bg-white hover:border-[#06054e]/20 hover:shadow-sm"
                      }`}
                    >
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-yellow-400 text-[#06054e] shadow-sm ${
                          assocHome ? "ring-1 ring-black/10" : ""
                        }`}
                      >
                        <Icon className="h-4 w-4" aria-hidden />
                      </span>
                      <span className="min-w-0 text-left">
                        <span
                          className={`block font-black text-[11px] uppercase leading-tight tracking-wide truncate ${
                            assocHome ? "text-white" : "text-slate-900"
                          }`}
                        >
                          {label}
                        </span>
                        <span
                          className={`mt-0.5 block text-[9px] font-bold leading-snug line-clamp-2 ${
                            assocHome ? "text-white/75" : "text-slate-500"
                          }`}
                        >
                          {desc}
                        </span>
                      </span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          </aside>
        </div>
      </div>

      <section
        className={`text-white py-14 mt-4 ${assocHome ? "" : "bg-gradient-to-r from-[#06054e] to-[#0a0870]"}`}
        style={
          assocHome && associationPortal
            ? {
                background: tenantPrimaryGradient(
                  String(associationPortal.primaryColor ?? "#06054e"),
                  0.75,
                ),
              }
            : undefined
        }
      >
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-black uppercase mb-3 drop-shadow-sm">
            {associationPortal
              ? `Join ${joinOrgName}`
              : "Join Brisbane Hockey"}
          </h2>
          <p className="text-white/90 mb-8 max-w-xl mx-auto text-sm font-semibold drop-shadow-sm">
            {associationPortal
              ? "Find a member club, follow your division, and get involved as a player, coach, or volunteer."
              : "Find a club, follow your division, and get involved as a player, coach, or volunteer."}
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              href={withPortalQuery(clubsDirectoryHref)}
              className="px-6 py-3 bg-yellow-400 text-[#06054e] rounded-full font-black uppercase text-xs hover:bg-yellow-300 ring-2 ring-black/10"
            >
              {associationPortal ? "Member clubs" : "Find a club"}
            </Link>
            <Link
              href={withPortalQuery("/competitions/leagues")}
              className="px-6 py-3 border-2 border-white/80 rounded-full font-black uppercase text-xs hover:bg-white/10"
            >
              Leagues
            </Link>
            <Link
              href={withPortalQuery("/tournaments")}
              className="px-6 py-3 border-2 border-white/80 rounded-full font-black uppercase text-xs hover:bg-white/10"
            >
              Tournaments
            </Link>
            <Link
              href={withPortalQuery("/representative")}
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
