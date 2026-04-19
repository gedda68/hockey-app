import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicAssociationById } from "@/lib/public/publicAssociation";
import { listPublicLeagues } from "@/lib/public/publicLeagues";
import { listPublicTournaments } from "@/lib/public/publicTournaments";
import { listPublicClubsByAssociation } from "@/lib/public/publicClubs";
import {
  associationPortalPageUrl,
  buildApexSiteOrigin,
} from "@/lib/tenant/subdomainUrls";
import {
  getPublicNewsFlowdownForAssociation,
  serializeNewsFlowdown,
} from "@/lib/data/newsFlowdown";
import NewsFlowdownModal from "@/components/website/news/NewsFlowdownModal";
import { getPortalRootDomain } from "@/lib/tenant/portalHost";
import type { PublicTenantPayload } from "@/lib/tenant/portalHost";
import type { PublicTournamentRow } from "@/lib/public/publicTournaments";
import MyFixturesStrip from "@/components/matches/MyFixturesStrip";
import {
  associationHubChampionshipsIntro,
  associationHubLocalLeagueIntro,
  associationHubNewsIntro,
  associationHubRepPathwaysIntro,
} from "@/lib/website/associationHubCopy";
import { buildPathwaysCards } from "@/lib/website/pathwaysCards";
import PathwaysGrid from "@/components/website/pathways/PathwaysGrid";
import LeagueIcalSubscribePanel from "@/components/website/LeagueIcalSubscribePanel";

function hexToRgba(hex: string, alpha: number): string | null {
  const h = hex.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const a = Math.max(0, Math.min(1, alpha));
  return `rgba(${r}, ${g}, ${b}, ${a})`;
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

function tournamentCard(t: PublicTournamentRow) {
  return (
    <Link
      href={`/tournaments/${t.tournamentId}`}
      className="block rounded-xl border border-white/10 bg-white/5 px-4 py-3 hover:border-sky-400/30"
    >
      <span className="font-bold text-white">{t.title}</span>
      <p className="text-xs text-white/55">
        {t.season} · {t.ageGroup} · {t.location}
      </p>
      {t.championTeamName ? (
        <p className="mt-1 text-xs font-bold text-amber-200/90">
          Champion: {t.championTeamName}
        </p>
      ) : null}
    </Link>
  );
}

export default async function AssociationHubView({
  associationId,
  backToClubsHref,
  tenant,
}: {
  associationId: string;
  backToClubsHref?: string;
  tenant?: PublicTenantPayload | null;
}) {
  const assoc = await getPublicAssociationById(associationId);
  if (!assoc) notFound();

  if (tenant?.kind === "association" && tenant.id !== associationId) {
    notFound();
  }
  if (tenant?.kind === "club") {
    notFound();
  }

  const onAssociationPortal = tenant?.kind === "association" && tenant.id === associationId;
  const portalRoot = getPortalRootDomain();
  const associationPortalHubUrl = associationPortalPageUrl(
    { code: assoc.code, portalSlug: assoc.portalSlug },
    `/associations/${encodeURIComponent(associationId)}`,
  );

  const tournamentTenant =
    tenant?.kind === "association" && tenant.id === associationId
      ? tenant
      : null;

  const [leagues, associationTournaments, newsFlowRaw] = await Promise.all([
    listPublicLeagues({ owningAssociationId: associationId }),
    listPublicTournaments({
      limit: 80,
      associationId,
      tenant: tournamentTenant,
    }),
    getPublicNewsFlowdownForAssociation(associationId, { perSectionLimit: 10 }),
  ]);
  const newsFlow = serializeNewsFlowdown(newsFlowRaw);
  const clubs = await listPublicClubsByAssociation(associationId, { limit: 24 });

  const clubsBack = backToClubsHref ?? `${buildApexSiteOrigin()}/clubs`;
  const level = assoc.level;

  const uncrowned = associationTournaments.filter((t) => !t.championTeamName);
  const pathwaySpotlights = uncrowned.slice(0, 5);

  const championshipsSorted = [...associationTournaments].sort((a, b) => {
    const ac = a.championTeamName ? 1 : 0;
    const bc = b.championTeamName ? 1 : 0;
    if (ac !== bc) return bc - ac;
    return b.season.localeCompare(a.season);
  });

  const primary = assoc.branding?.primaryColor?.trim() || "#06054e";
  const primary75 = hexToRgba(primary, 0.75) ?? primary;

  const thisRoundHref =
    leagues[0]?.seasonCompetitionId != null
      ? `/competitions/this-round?seasonCompetitionId=${encodeURIComponent(
          leagues[0].seasonCompetitionId,
        )}`
      : "/competitions/this-round";

  return (
    <div
      className="min-h-screen px-4 pb-20 pt-8 md:px-8"
      style={{
        background: `linear-gradient(135deg, ${primary} 0%, ${primary75} 55%, #0b1220 100%)`,
      }}
    >
      <div className="mx-auto max-w-3xl">
        <Link
          href={clubsBack}
          className="mb-6 inline-flex text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white"
        >
          ← Clubs & hockey
        </Link>

        <h1 className="text-3xl font-black uppercase italic tracking-tight text-white sm:text-4xl">
          {assoc.name}
        </h1>
        <p className="mt-2 text-sm text-white/70">
          {assoc.fullName} · {assoc.region}, {assoc.state}
        </p>
        {assoc.website ? (
          <a
            href={assoc.website}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block text-sm font-semibold text-sky-300 hover:underline"
          >
            Official website ↗
          </a>
        ) : null}

        <div className="mt-5 rounded-2xl border border-white/15 bg-black/25 px-4 py-3 text-xs leading-relaxed text-white/75">
          <p className="font-black uppercase tracking-widest text-[10px] text-white/50">
            Portal scope
          </p>
          {onAssociationPortal ? (
            <p className="mt-2">
              You are on this association&apos;s portal host (
              <span className="font-mono text-white/90">
                {tenant.portalSlug}.{portalRoot}
              </span>
              ). The News block lists this body&apos;s articles first, then parent-association items
              that flow down the tree (each row is{" "}
              <span className="font-mono text-emerald-200/90">scopeType=association</span> for one
              org in your chain).
            </p>
          ) : (
            <p className="mt-2">
              Hub content is for{" "}
              <span className="font-semibold text-white">{assoc.name}</span> (
              <span className="font-mono text-white/90">{associationId}</span>). News uses the same
              flow-down rules on any host (this body first, then parents). For the branded
              subdomain experience, open{" "}
              <a
                href={associationPortalHubUrl}
                className="font-bold text-sky-300 underline decoration-sky-400/40 hover:decoration-sky-300"
              >
                this hub on the association portal
              </a>
              .
            </p>
          )}
        </div>

        <nav
          className="mt-8 flex flex-wrap gap-2 border-y border-white/10 py-4"
          aria-label="On this page"
        >
          {hubNavLink("#pathways", "Get involved")}
          {hubNavLink("#rep-pathways", "Rep & pathways")}
          {hubNavLink("#championships", "Championships")}
          {hubNavLink("#local-league", "Local league")}
          {hubNavLink("#news", "News")}
          {hubNavLink("#contacts", "Contacts")}
        </nav>

        <section id="pathways" className="mt-10 scroll-mt-24">
          <PathwaysGrid
            cards={buildPathwaysCards(
              {
                kind: "association",
                associationId,
                associationName: assoc.name,
              },
              null,
            )}
            variant="dark"
            heading="Play · coach · umpire · volunteer"
            intro="Tenant-scoped entry points: club registration, representative nominations, and portal role requests after you sign in."
          />
        </section>

        {/* —— Rep & pathways —— */}
        <section id="rep-pathways" className="mt-12 scroll-mt-24">
          <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-violet-200">
            Rep & pathways
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-white/75">
            {associationHubRepPathwaysIntro(level)}
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <Link
              href="/tournaments"
              className="block rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center text-xs font-black uppercase tracking-wide text-white hover:border-violet-300/40"
            >
              Tournaments
              <span className="mt-1 block text-[10px] font-semibold normal-case tracking-normal text-white/55">
                Rep & carnival hub
              </span>
            </Link>
            <a
              href="#local-league"
              className="block rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center text-xs font-black uppercase tracking-wide text-white hover:border-violet-300/40"
            >
              Local league
              <span className="mt-1 block text-[10px] font-semibold normal-case tracking-normal text-white/55">
                Match day & clubs
              </span>
            </a>
            <Link
              href={`${buildApexSiteOrigin()}/clubs`}
              className="block rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center text-xs font-black uppercase tracking-wide text-white hover:border-violet-300/40"
            >
              Find a club
              <span className="mt-1 block text-[10px] font-semibold normal-case tracking-normal text-white/55">
                Member clubs
              </span>
            </Link>
          </div>
          {pathwaySpotlights.length > 0 ? (
            <div className="mt-8">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-white/50">
                In progress & upcoming
              </h3>
              <ul className="mt-3 space-y-2">
                {pathwaySpotlights.map((t) => (
                  <li key={t.tournamentId}>{tournamentCard(t)}</li>
                ))}
              </ul>
              {associationTournaments.length > pathwaySpotlights.length ? (
                <a
                  href="#championships"
                  className="mt-3 inline-block text-xs font-bold text-violet-200 hover:underline"
                >
                  All tournaments & titles →
                </a>
              ) : null}
            </div>
          ) : (
            <p className="mt-6 text-sm text-white/55">
              No rep tournaments linked here yet. Open the{" "}
              <Link href="/tournaments" className="text-violet-200 underline">
                tournaments directory
              </Link>{" "}
              for the full public list.
            </p>
          )}
        </section>

        {/* —— Championships & rep events —— */}
        <section id="championships" className="mt-14 scroll-mt-24">
          <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-sky-200">
            Championships & rep events
          </h2>
          <p className="mt-3 text-sm text-white/70">
            {associationHubChampionshipsIntro(level)}
          </p>
          <ul className="mt-5 space-y-2">
            {championshipsSorted.length === 0 ? (
              <li className="text-sm text-white/50">
                No tournaments linked to this association. See{" "}
                <Link href="/tournaments" className="text-sky-300 underline">
                  all tournaments
                </Link>
                .
              </li>
            ) : (
              championshipsSorted.map((t) => (
                <li key={t.tournamentId}>{tournamentCard(t)}</li>
              ))
            )}
          </ul>
        </section>

        {/* —— Local league (match day, my fixtures, clubs, season comps) —— */}
        <section id="local-league" className="mt-14 scroll-mt-24">
          <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-yellow-200">
            Local league
          </h2>
          <p className="mt-3 text-sm text-white/70">
            {associationHubLocalLeagueIntro(level)}
          </p>

          <div className="mt-6">
            <MyFixturesStrip scope={{ associationId }} title="My fixtures" />
          </div>

          <h3 className="mt-10 text-[10px] font-black uppercase tracking-widest text-white/50">
            Match day
          </h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Link
              href={thisRoundHref}
              className="block rounded-2xl border border-white/10 bg-white/5 px-5 py-4 font-black text-white hover:border-yellow-400/30"
            >
              This round →
              <p className="mt-1 text-xs font-semibold text-white/60">
                Filters, ladder, and match centre links
              </p>
            </Link>
            <Link
              href="/competitions/leagues"
              className="block rounded-2xl border border-white/10 bg-white/5 px-5 py-4 font-black text-white hover:border-sky-400/30"
            >
              All leagues →
              <p className="mt-1 text-xs font-semibold text-white/60">
                Browse draws and standings
              </p>
            </Link>
            <Link
              href={`/associations/${encodeURIComponent(associationId)}/venue-calendar`}
              className="block rounded-2xl border border-white/10 bg-white/5 px-5 py-4 font-black text-white hover:border-emerald-400/30 sm:col-span-2"
            >
              Pitch calendar (week &amp; month) →
              <p className="mt-1 text-xs font-semibold text-white/60">
                Games, training, and other bookings (commercial hire shows only as &quot;Private&quot;
                for transparency)
              </p>
            </Link>
          </div>

          <LeagueIcalSubscribePanel
            leagues={leagues}
            portalHint={tenant?.portalSlug ?? assoc.portalSlug ?? null}
            attachPortalHint={!onAssociationPortal}
          />

          <div className="mt-10 flex items-end justify-between gap-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-white/50">
              Member clubs
            </h3>
            <Link
              href={`${buildApexSiteOrigin()}/clubs`}
              className="text-[10px] font-black uppercase tracking-widest text-white/60 hover:text-white"
            >
              View all →
            </Link>
          </div>
          {clubs.length === 0 ? (
            <p className="mt-3 text-sm text-white/60">
              No active clubs are linked to this association yet.
            </p>
          ) : (
            <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {clubs.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/clubs/${encodeURIComponent(c.slug)}`}
                    className="block rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white hover:border-emerald-400/30"
                  >
                    <div className="font-bold">
                      {c.name}
                      {c.shortName ? (
                        <span className="text-white/55"> · {c.shortName}</span>
                      ) : null}
                    </div>
                    <div className="mt-1 text-xs text-white/55">Open club hub →</div>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <h3 className="mt-10 text-[10px] font-black uppercase tracking-widest text-white/50">
            Season competitions
          </h3>
          <ul className="mt-3 space-y-2">
            {leagues.length === 0 ? (
              <li className="text-sm text-white/50">
                No published season leagues for this association yet.
              </li>
            ) : (
              leagues.map((l) => (
                <li key={l.seasonCompetitionId}>
                  <Link
                    href={`/competitions/leagues/${l.seasonCompetitionId}`}
                    className="block rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white hover:border-yellow-400/30"
                  >
                    <span className="font-bold">
                      {l.competitionName ?? l.competitionId}{" "}
                      <span className="text-yellow-200">{l.season}</span>
                    </span>
                  </Link>
                </li>
              ))
            )}
          </ul>
        </section>

        {/* —— News (tenant-scoped) —— */}
        <section id="news" className="mt-14 scroll-mt-24">
          <div className="flex items-end justify-between gap-4">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-200">
              News
            </h2>
            <Link
              href="/news"
              className="text-[10px] font-black uppercase tracking-widest text-white/60 hover:text-white"
            >
              View all →
            </Link>
          </div>
          <p className="mt-2 text-xs text-white/55">{associationHubNewsIntro()}</p>
          <div className="mt-4">
            <NewsFlowdownModal sections={newsFlow.sections} variant="dark" />
          </div>
        </section>

        {/* —— Contacts —— */}
        <section id="contacts" className="mt-14 scroll-mt-24">
          <div className="flex items-end justify-between gap-4">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-sky-200">
              Contacts
            </h2>
            <Link
              href={`/associations/${encodeURIComponent(associationId)}/contacts`}
              className="text-[10px] font-black uppercase tracking-widest text-white/60 hover:text-white"
            >
              Contact page →
            </Link>
          </div>
          <p className="mt-2 text-xs text-white/55">
            Committee and public contacts published by this association.
          </p>
          {!assoc.positions || assoc.positions.length === 0 ? (
            <p className="mt-3 text-sm text-white/60">
              No public committee contacts available yet.
            </p>
          ) : (
            <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {assoc.positions
                .slice()
                .sort((a, b) => a.title.localeCompare(b.title))
                .map((p) => (
                  <li
                    key={p.positionId}
                    className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white"
                  >
                    <div className="font-black">{p.displayName ?? p.title}</div>
                    {p.description ? (
                      <p className="mt-1 text-sm text-white/70 line-clamp-3 whitespace-pre-wrap">
                        {p.description}
                      </p>
                    ) : null}
                    <div className="mt-2 space-y-1 text-sm text-white/80">
                      {p.email ? (
                        <a className="hover:underline" href={`mailto:${p.email}`}>
                          {p.email}
                        </a>
                      ) : null}
                      {p.phone ? (
                        <a className="hover:underline" href={`tel:${p.phone}`}>
                          {p.phone}
                        </a>
                      ) : null}
                      {!p.email && !p.phone ? (
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
