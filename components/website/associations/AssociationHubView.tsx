import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicAssociationById } from "@/lib/public/publicAssociation";
import { listPublicLeagues } from "@/lib/public/publicLeagues";
import { listPublicTournaments } from "@/lib/public/publicTournaments";
import { buildApexSiteOrigin } from "@/lib/tenant/subdomainUrls";

export default async function AssociationHubView({
  associationId,
  backToClubsHref,
}: {
  associationId: string;
  /** Override when linking back from a tenant subdomain */
  backToClubsHref?: string;
}) {
  const assoc = await getPublicAssociationById(associationId);
  if (!assoc) notFound();

  const [leagues, tournaments] = await Promise.all([
    listPublicLeagues({ owningAssociationId: associationId }),
    listPublicTournaments({ limit: 80 }),
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
