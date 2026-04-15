import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicAssociationById } from "@/lib/public/publicAssociation";
import { listPublicLeagues } from "@/lib/public/publicLeagues";
import { listPublicTournaments } from "@/lib/public/publicTournaments";
import { buildApexSiteOrigin } from "@/lib/tenant/subdomainUrls";
import { getPublicNewsItems } from "@/lib/data/publicNews";
import type { PublicTenantPayload } from "@/lib/tenant/portalHost";

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

  const [leagues, tournaments, news] = await Promise.all([
    listPublicLeagues({ owningAssociationId: associationId }),
    listPublicTournaments({ limit: 80 }),
    getPublicNewsItems(6, tenant ?? null),
  ]);
  const ourTournaments = tournaments.filter(
    (t) => t.brandingAssociationId === associationId || t.hostId === associationId,
  );

  const clubsBack =
    backToClubsHref ?? `${buildApexSiteOrigin()}/clubs`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#06054e] via-slate-900 to-slate-800 px-4 pb-20 pt-8 md:px-8">
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
            {ourTournaments.length === 0 ? (
              <li className="text-sm text-white/50">
                No tournaments linked to this association in the sample set. See{" "}
                <Link href="/tournaments" className="text-sky-300 underline">
                  all tournaments
                </Link>
                .
              </li>
            ) : (
              ourTournaments.map((t) => (
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
