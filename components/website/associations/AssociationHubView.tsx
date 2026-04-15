import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicAssociationById } from "@/lib/public/publicAssociation";
import { listPublicLeagues } from "@/lib/public/publicLeagues";
import { listPublicTournaments } from "@/lib/public/publicTournaments";
import { listPublicClubsByAssociation } from "@/lib/public/publicClubs";
import { buildApexSiteOrigin } from "@/lib/tenant/subdomainUrls";
import { getPublicNewsItems } from "@/lib/data/publicNews";
import type { PublicTenantPayload } from "@/lib/tenant/portalHost";
import MyFixturesStrip from "@/components/matches/MyFixturesStrip";

function hexToRgba(hex: string, alpha: number): string | null {
  const h = hex.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const a = Math.max(0, Math.min(1, alpha));
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

export default async function AssociationHubView({
  associationId,
  backToClubsHref,
  tenant,
}: {
  associationId: string;
  /** Override when linking back from a tenant subdomain */
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

  const [leagues, associationTournaments, news] = await Promise.all([
    listPublicLeagues({ owningAssociationId: associationId }),
    listPublicTournaments({ limit: 80, associationId }),
    getPublicNewsItems(6, tenant ?? null),
  ]);
  const clubs = await listPublicClubsByAssociation(associationId, { limit: 24 });

  const clubsBack =
    backToClubsHref ?? `${buildApexSiteOrigin()}/clubs`;

  const primary = assoc.branding?.primaryColor?.trim() || "#06054e";
  const primary75 = hexToRgba(primary, 0.75) ?? primary;

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
        {assoc.website && (
          <a
            href={assoc.website}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block text-sm font-semibold text-sky-300 hover:underline"
          >
            Official website ↗
          </a>
        )}

        <MyFixturesStrip scope={{ associationId }} title="My fixtures" />

        <section className="mt-10">
          <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-yellow-200">
            Match day
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Link
              href={
                leagues[0]?.seasonCompetitionId
                  ? `/competitions/this-round?seasonCompetitionId=${encodeURIComponent(
                      leagues[0].seasonCompetitionId,
                    )}`
                  : "/competitions/this-round"
              }
              className="block rounded-2xl border border-white/10 bg-white/5 px-5 py-4 font-black text-white hover:border-yellow-400/30"
            >
              This round →
              <p className="mt-1 text-xs font-semibold text-white/60">
                Filters + ladder + match centre links
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
          </div>
        </section>

        <section className="mt-12">
          <div className="flex items-end justify-between gap-4">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-200">
              Member clubs
            </h2>
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
                    <div className="mt-1 text-xs text-white/55">
                      Open club hub →
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-12">
          <div className="flex items-end justify-between gap-4">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-sky-200">
              Committee & contacts
            </h2>
          </div>
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
                    <div className="font-black">
                      {p.displayName ?? p.title}
                    </div>
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

        <section className="mt-12">
          <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-yellow-200">
            League competitions
          </h2>
          <ul className="mt-4 space-y-2">
            {leagues.length === 0 ? (
              <li className="text-sm text-white/50">No published leagues for this association yet.</li>
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

        <section className="mt-12">
          <div className="flex items-end justify-between gap-4">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-200">
              Latest news
            </h2>
            <Link
              href="/news"
              className="text-[10px] font-black uppercase tracking-widest text-white/60 hover:text-white"
            >
              View all →
            </Link>
          </div>
          <ul className="mt-4 space-y-2">
            {news.length === 0 ? (
              <li className="text-sm text-white/50">
                No published news on this portal yet.
              </li>
            ) : (
              news.map((n) => (
                <li
                  key={n.id}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white"
                >
                  <div className="text-xs text-white/55">
                    {n.publishDate
                      ? n.publishDate.toLocaleDateString("en-AU", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      : null}
                    {n.author ? ` · ${n.author}` : ""}
                  </div>
                  <div className="mt-1 font-bold">{n.title}</div>
                  {n.content ? (
                    <p className="mt-2 text-sm text-white/70 line-clamp-3 whitespace-pre-wrap">
                      {n.content}
                    </p>
                  ) : null}
                </li>
              ))
            )}
          </ul>
        </section>

        <section className="mt-12">
          <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-sky-200">
            Representative tournaments
          </h2>
          <ul className="mt-4 space-y-2">
            {associationTournaments.length === 0 ? (
              <li className="text-sm text-white/50">
                No tournaments linked to this association in the sample set. See{" "}
                <Link href="/tournaments" className="text-sky-300 underline">
                  all tournaments
                </Link>
                .
              </li>
            ) : (
              associationTournaments.map((t) => (
                <li key={t.tournamentId}>
                  <Link
                    href={`/tournaments/${t.tournamentId}`}
                    className="block rounded-xl border border-white/10 bg-white/5 px-4 py-3 hover:border-sky-400/30"
                  >
                    <span className="font-bold text-white">{t.title}</span>
                    <p className="text-xs text-white/55">
                      {t.season} · {t.ageGroup} · {t.location}
                    </p>
                  </Link>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}
