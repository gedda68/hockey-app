import { cache } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import clientPromise from "@/lib/mongodb";
import {
  getPublicPlayerProfile,
  type ProfileAssociation,
} from "@/lib/competitions/publicPlayerProfile";
import type { PlayerSeasonTotals } from "@/lib/competitions/playerSeasonStats";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ memberId: string }> };

// React cache() so generateMetadata and the page share one lookup per request.
const loadProfile = cache(async (memberId: string) => {
  const client = await clientPromise;
  const db = client.db(process.env.DB_NAME || "hockey-app");
  return getPublicPlayerProfile(db, memberId);
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { memberId } = await params;
  const profile = await loadProfile(memberId);
  return { title: profile ? `${profile.displayName} — Player stats` : "Player" };
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
      <div className="text-3xl font-black text-white">{value}</div>
      <div className="mt-1 text-[9px] font-black uppercase tracking-widest text-slate-400">
        {label}
      </div>
    </div>
  );
}

function CareerTiles({ t }: { t: PlayerSeasonTotals }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      <StatTile label="Matches" value={t.matchesWithEvents} />
      <StatTile label="Goals" value={t.goals} />
      <StatTile label="Assists" value={t.assists} />
      <StatTile label="GK saves" value={t.gkSaves} />
      <StatTile label="Green" value={t.greenCards} />
      <StatTile label="Yellow / Red" value={t.yellowCards + t.redCards} />
    </div>
  );
}

function AssociationBlock({ a }: { a: ProfileAssociation }) {
  return (
    <section className="rounded-3xl border border-white/10 bg-[#06054e] p-6 shadow-2xl md:p-8">
      <h2 className="text-xl font-black uppercase italic text-white">
        {a.associationName}
      </h2>

      <div className="mt-5">
        <CareerTiles t={a.career} />
      </div>

      <div className="mt-8 overflow-x-auto">
        <table className="w-full min-w-[32rem] text-left text-xs text-white">
          <caption className="sr-only">
            Season-by-season stats for {a.associationName}
          </caption>
          <thead>
            <tr className="border-b border-white/20 text-[9px] font-black uppercase tracking-widest text-slate-400">
              <th scope="col" className="py-2 pr-4">Season</th>
              <th scope="col" className="py-2 pr-4">Competition</th>
              <th scope="col" className="py-2 pr-4 text-center">M</th>
              <th scope="col" className="py-2 pr-4 text-center">G</th>
              <th scope="col" className="py-2 pr-4 text-center">A</th>
              <th scope="col" className="py-2 pr-4 text-center">GK</th>
              <th scope="col" className="py-2 text-center">Cards</th>
            </tr>
          </thead>
          <tbody>
            {a.bySeason.map((s) => (
              <tr key={s.seasonCompetitionId} className="border-b border-white/10">
                <td className="py-2 pr-4 font-bold">{s.season}</td>
                <td className="py-2 pr-4">
                  <Link
                    href={`/competitions/standings?seasonCompetitionId=${encodeURIComponent(s.seasonCompetitionId)}`}
                    className="hover:underline"
                  >
                    {s.competitionName}
                  </Link>
                </td>
                <td className="py-2 pr-4 text-center">{s.totals.matchesWithEvents}</td>
                <td className="py-2 pr-4 text-center">{s.totals.goals}</td>
                <td className="py-2 pr-4 text-center">{s.totals.assists}</td>
                <td className="py-2 pr-4 text-center">{s.totals.gkSaves}</td>
                <td className="py-2 text-center">
                  {s.totals.greenCards + s.totals.yellowCards + s.totals.redCards}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default async function PlayerProfilePage({ params }: Props) {
  const { memberId } = await params;
  const profile = await loadProfile(memberId);
  if (!profile) notFound();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#06054e] via-slate-900 to-slate-800 px-4 pb-16 pt-8 md:px-8">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/search"
          className="group flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white"
        >
          <span className="transition-transform group-hover:-translate-x-1">←</span>
          Back to search
        </Link>

        <header className="mb-10 mt-6 border-b-4 border-[#06054e] pb-6">
          <h1 className="text-4xl font-black uppercase italic tracking-tight text-yellow-200 md:text-5xl">
            {profile.displayName}
          </h1>

          {profile.teams.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-2" aria-label="Teams">
              {profile.teams.map((t) => (
                <li key={t.teamId}>
                  {t.clubId ? (
                    <Link
                      href={`/clubs/${encodeURIComponent(t.clubId)}/teams/${encodeURIComponent(t.teamId)}`}
                      className="inline-flex rounded-full border border-white/20 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white hover:bg-white/10"
                    >
                      {t.name}
                      {t.clubName ? ` · ${t.clubName}` : ""}
                    </Link>
                  ) : (
                    <span className="inline-flex rounded-full border border-white/20 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white">
                      {t.name}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </header>

        <div className="space-y-8">
          {profile.associations.map((a) => (
            <AssociationBlock key={a.owningAssociationId} a={a} />
          ))}
        </div>

        <p className="mt-8 text-[10px] text-slate-400">
          Stats come from published match results only.
        </p>
      </div>
    </div>
  );
}
