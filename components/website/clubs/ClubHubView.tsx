import Link from "next/link";
import { notFound } from "next/navigation";
import clientPromise from "@/lib/mongodb";
import {
  getPublicNewsFlowdownForClub,
  serializeNewsFlowdown,
} from "@/lib/data/newsFlowdown";
import { listPublicLeagues } from "@/lib/public/publicLeagues";
import NewsFlowdownModal from "@/components/website/news/NewsFlowdownModal";
import type { PublicTenantPayload } from "@/lib/tenant/portalHost";
import { sanitizeCommitteeForPublic } from "@/lib/portal/publicContacts";
import MyFixturesStrip from "@/components/matches/MyFixturesStrip";
import {
  buildApexSiteOrigin,
  clubPortalPageUrl,
} from "@/lib/tenant/subdomainUrls";
import { getPortalRootDomain } from "@/lib/tenant/portalHost";
import { buildPathwaysCards } from "@/lib/website/pathwaysCards";
import PathwaysGrid from "@/components/website/pathways/PathwaysGrid";
import LeagueIcalSubscribePanel from "@/components/website/LeagueIcalSubscribePanel";

type PublicClub = {
  id: string;
  slug: string;
  name: string;
  shortName?: string;
  logo?: string;
  iconSrc?: string;
  portalSlug?: string;
  associationId?: string;
  parentAssociationId?: string;
  colors?: {
    primary?: string;
    secondary?: string;
    accent?: string;
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
  };
  committee?: unknown;
};

async function getClubForHub(clubIdOrSlug: string): Promise<PublicClub | null> {
  const client = await clientPromise;
  const db = client.db(process.env.DB_NAME || "hockey-app");
  const club =
    (await db.collection("clubs").findOne(
      { slug: clubIdOrSlug },
      {
        projection: {
          id: 1,
          slug: 1,
          name: 1,
          title: 1,
          shortName: 1,
          logo: 1,
          iconSrc: 1,
          portalSlug: 1,
          associationId: 1,
          parentAssociationId: 1,
          colors: 1,
          committee: 1,
        },
      },
    )) ??
    (await db.collection("clubs").findOne(
      { id: clubIdOrSlug },
      {
        projection: {
          id: 1,
          slug: 1,
          name: 1,
          title: 1,
          shortName: 1,
          logo: 1,
          iconSrc: 1,
          portalSlug: 1,
          associationId: 1,
          parentAssociationId: 1,
          colors: 1,
          committee: 1,
        },
      },
    ));

  if (!club) return null;
  const id = String(club.id ?? "");
  const slug = String(club.slug ?? id).trim();
  const name = String(club.name ?? club.title ?? "").trim();
  if (!slug || !name) return null;
  return {
    id,
    slug,
    name,
    shortName: club.shortName ? String(club.shortName) : undefined,
    logo: club.logo ? String(club.logo) : undefined,
    iconSrc: club.iconSrc ? String(club.iconSrc) : undefined,
    portalSlug: club.portalSlug ? String(club.portalSlug) : undefined,
    associationId: club.associationId ? String(club.associationId) : undefined,
    parentAssociationId: club.parentAssociationId
      ? String(club.parentAssociationId)
      : undefined,
    colors: (club.colors ?? undefined) as PublicClub["colors"],
    committee: club.committee ?? null,
  };
}

function clubPrimary(club: PublicClub): string {
  return (
    club.colors?.primaryColor ||
    club.colors?.primary ||
    "#06054e"
  );
}

function clubSecondary(club: PublicClub): string {
  return (
    club.colors?.secondaryColor ||
    club.colors?.secondary ||
    "#0b0a3a"
  );
}

function hubNavLink(href: string, label: string) {
  return (
    <a
      key={href}
      href={href}
      className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-white/80 hover:border-yellow-300/40 hover:text-white"
    >
      {label}
    </a>
  );
}

export default async function ClubHubView({
  clubId,
  tenant,
}: {
  clubId: string;
  tenant: PublicTenantPayload | null;
}) {
  const club = await getClubForHub(clubId);
  if (!club) notFound();

  if (tenant?.kind === "club" && tenant.id !== club.id) notFound();
  if (tenant?.kind === "association") {
    const owner = club.associationId ?? club.parentAssociationId ?? "";
    if (!owner || owner !== tenant.id) notFound();
  }

  const owningAssoc = club.associationId ?? club.parentAssociationId ?? "";
  const leagues = owningAssoc
    ? await listPublicLeagues({ owningAssociationId: owningAssoc })
    : [];
  const firstLeague = leagues[0];
  const clubThisRoundHref =
    firstLeague?.seasonCompetitionId != null
      ? `/competitions/this-round?seasonCompetitionId=${encodeURIComponent(
          firstLeague.seasonCompetitionId,
        )}&clubId=${encodeURIComponent(club.id)}`
      : `/competitions/this-round?clubId=${encodeURIComponent(club.id)}`;
  const leagueHubHref = firstLeague?.seasonCompetitionId
    ? `/competitions/leagues/${encodeURIComponent(firstLeague.seasonCompetitionId)}`
    : "/competitions/leagues";
  const myTeamsHref = `/competitions/my-fixtures?clubId=${encodeURIComponent(club.id)}`;

  const newsFlow = serializeNewsFlowdown(
    await getPublicNewsFlowdownForClub(club.id, { perSectionLimit: 10 }),
  );
  const committee = sanitizeCommitteeForPublic(club.committee);
  const primary = clubPrimary(club);
  const secondary = clubSecondary(club);

  const onClubPortal = tenant?.kind === "club" && tenant.id === club.id;
  const portalRoot = getPortalRootDomain();
  const clubPortalHubUrl = clubPortalPageUrl(club, "/");

  return (
    <div
      className="min-h-screen px-4 pb-20 pt-8 md:px-8"
      style={{
        background: `linear-gradient(135deg, ${primary} 0%, ${secondary} 55%, #0b1220 100%)`,
      }}
    >
      <div className="mx-auto max-w-4xl">
        <Link
          href={`${buildApexSiteOrigin()}/clubs`}
          className="mb-6 inline-flex text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white"
        >
          ← All clubs
        </Link>

        <h1 className="text-3xl font-black uppercase italic tracking-tight text-white sm:text-4xl">
          {club.name}
        </h1>
        {club.shortName ? (
          <p className="mt-2 text-sm text-white/70">{club.shortName}</p>
        ) : null}

        <div className="mt-5 rounded-2xl border border-white/15 bg-black/25 px-4 py-3 text-xs leading-relaxed text-white/75">
          <p className="font-black uppercase tracking-widest text-[10px] text-white/50">
            Portal scope
          </p>
          {onClubPortal ? (
            <p className="mt-2">
              You are on this club&apos;s portal (
              <span className="font-mono text-white/90">
                {tenant.portalSlug}.{portalRoot}
              </span>
              ). Fixtures and news below use this club and its parent association chain only.
            </p>
          ) : (
            <p className="mt-2">
              Open{" "}
              <a
                href={clubPortalHubUrl}
                className="font-bold text-sky-300 underline decoration-sky-400/40 hover:decoration-sky-300"
              >
                this hub on the club subdomain
              </a>{" "}
              for the full branded portal. Fixture links still filter to this club on any host.
            </p>
          )}
        </div>

        <nav
          className="mt-6 flex flex-wrap gap-2 border-y border-white/10 py-4"
          aria-label="On this page"
        >
          {hubNavLink("#pathways", "Get involved")}
          {hubNavLink(`/clubs/${encodeURIComponent(club.slug)}/volunteer-duties`, "Volunteer duties")}
          {hubNavLink("#match-day", "Fixtures")}
          {hubNavLink("#news", "News")}
          {hubNavLink("#contact", "Contact")}
        </nav>

        <section id="pathways" className="mt-8 scroll-mt-24">
          <PathwaysGrid
            cards={buildPathwaysCards(
              {
                kind: "club",
                clubId: club.id,
                clubSlug: club.slug,
                clubName: club.name,
              },
              null,
            )}
            variant="dark"
            heading="Play · coach · umpire · volunteer"
            intro="Start at this club: season registration plus coach, umpire, and volunteer requests (sign in for role requests)."
          />
        </section>

        {/* Primary actions — P2 */}
        <section className="mt-8" aria-labelledby="club-hub-actions">
          <h2 id="club-hub-actions" className="sr-only">
            Club quick links
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Link
              href={`/clubs/${encodeURIComponent(club.slug)}/teams`}
              className="rounded-2xl border-2 border-yellow-400/35 bg-white/10 px-6 py-5 font-black text-white shadow-lg hover:border-yellow-300/60"
            >
              <span className="text-lg">Teams</span>
              <p className="mt-1 text-xs font-semibold text-white/65">
                Rosters, divisions, and team pages
              </p>
            </Link>
            <Link
              href={`/clubs/${encodeURIComponent(club.slug)}/register`}
              className="rounded-2xl border-2 border-yellow-400/50 bg-yellow-400/15 px-6 py-5 font-black text-yellow-50 shadow-lg hover:bg-yellow-400/25"
            >
              <span className="text-lg">Join / Register</span>
              <p className="mt-1 text-xs font-semibold text-yellow-100/80">
                Season registration and renewals
              </p>
            </Link>
            <Link
              href={clubThisRoundHref}
              className="rounded-2xl border border-white/15 bg-white/5 px-6 py-5 font-black text-white hover:border-sky-400/35"
            >
              <span className="text-lg">This round</span>
              <p className="mt-1 text-xs font-semibold text-white/60">
                Draw & ladder filtered to this club when data exists
              </p>
            </Link>
            <Link
              href={myTeamsHref}
              className="rounded-2xl border border-white/15 bg-white/5 px-6 py-5 font-black text-white hover:border-emerald-400/35"
            >
              <span className="text-lg">My teams</span>
              <p className="mt-1 text-xs font-semibold text-white/60">
                Signed-in members: fixtures for your assigned teams
              </p>
            </Link>
          </div>
        </section>

        <section id="match-day" className="mt-12 scroll-mt-24">
          <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-yellow-200">
            Match day & fixtures
          </h2>
          <p className="mt-2 text-sm text-white/70">
            Tenant-safe links: this club&apos;s id is applied to Match day where the competition
            exposes it. Use My teams when you are logged in.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href={clubThisRoundHref}
              className="inline-flex rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-bold text-white hover:border-yellow-400/30"
            >
              Open this round →
            </Link>
            <Link
              href={leagueHubHref}
              className="inline-flex rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-bold text-white hover:border-sky-400/30"
            >
              League hub →
            </Link>
            <Link
              href={myTeamsHref}
              className="inline-flex rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-bold text-white hover:border-emerald-400/30"
            >
              My teams view →
            </Link>
          </div>
          <LeagueIcalSubscribePanel
            leagues={leagues}
            portalHint={tenant?.portalSlug ?? club.portalSlug ?? null}
            attachPortalHint={!onClubPortal}
          />
          <MyFixturesStrip scope={{ clubId: club.id }} title="My fixtures" />
        </section>

        <section id="news" className="mt-14 scroll-mt-24">
          <div className="flex items-end justify-between gap-4">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-200">
              News
            </h2>
            <Link
              href="/news"
              className="text-[10px] font-black uppercase tracking-widest text-white/60 hover:text-white"
            >
              News index →
            </Link>
          </div>
          <p className="mt-2 text-xs text-white/55">
            This club first, then items from parent associations up the tree. Tap a headline for
            the full story.
          </p>
          <div className="mt-4">
            <NewsFlowdownModal sections={newsFlow.sections} variant="dark" />
          </div>
        </section>

        <section id="contact" className="mt-14 scroll-mt-24">
          <div className="flex items-end justify-between gap-4">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-sky-200">
              Committee & contacts
            </h2>
            <Link
              href={`/clubs/${encodeURIComponent(club.slug)}/contact`}
              className="text-[10px] font-black uppercase tracking-widest text-white/60 hover:text-white"
            >
              Contact page →
            </Link>
          </div>
          {committee.length === 0 ? (
            <p className="mt-3 text-sm text-white/60">
              No public committee contacts available yet.
            </p>
          ) : (
            <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {committee.map((m) => (
                <li
                  key={m.id}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white"
                >
                  <div className="font-black">{m.name}</div>
                  {m.position ? (
                    <div className="text-xs text-white/60">{m.position}</div>
                  ) : null}
                  <div className="mt-2 space-y-1 text-sm text-white/80">
                    {m.email ? (
                      <a className="hover:underline" href={`mailto:${m.email}`}>
                        {m.email}
                      </a>
                    ) : null}
                    {m.phone ? (
                      <a className="hover:underline" href={`tel:${m.phone}`}>
                        {m.phone}
                      </a>
                    ) : null}
                    {!m.email && !m.phone ? (
                      <span className="text-white/50 text-xs">
                        Contact details not published.
                      </span>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
