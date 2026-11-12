// app/(website)/clubs/[clubId]/teams/page.tsx
// Club teams for a season, grouped by Men / Women / Masters / Juniors, each with
// its current players and coaching staff (from the latest team sheet) and
// everyone who has played for it this season. Players can appear in more than
// one team. Team management lives at /teams/manage.

import Link from "next/link";
import { notFound } from "next/navigation";
import clientPromise from "@/lib/mongodb";
import {
  getClubTeamsOverview,
  resolveClub,
  TEAM_CATEGORY_LABEL,
  TEAM_CATEGORY_ORDER,
} from "@/lib/clubs/clubPortalData";
import ClubTeamCard from "@/components/clubs/ClubTeamCard";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ clubId: string }>;
  searchParams: Promise<{ season?: string }>;
}

export default async function ClubTeamsPage({ params, searchParams }: PageProps) {
  const { clubId } = await params;
  const { season: seasonParam } = await searchParams;
  const db = (await clientPromise).db(process.env.DB_NAME || "hockey-app");
  const club = await resolveClub(db, clubId);
  if (!club) notFound();

  const { seasons, season, teams } = await getClubTeamsOverview(db, club, { season: seasonParam });
  const byCategory = TEAM_CATEGORY_ORDER.map((c) => [c, teams.filter((t) => t.category === c)] as const).filter(([, list]) => list.length);

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6 md:p-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-[#06054e]">Teams</h1>
          <p className="mt-1 text-lg font-semibold text-slate-600">
            {teams.length} team{teams.length === 1 ? "" : "s"}
            {season ? ` in ${season}` : ""} · current players and coaching staff from each team&rsquo;s latest team sheet
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {seasons.length > 1 &&
            seasons.map((s) => (
              <Link
                key={s}
                href={`/clubs/${clubId}/teams?season=${encodeURIComponent(s)}`}
                aria-current={s === season ? "page" : undefined}
                className={`rounded-full px-4 py-2 text-sm font-bold ${
                  s === season ? "bg-[#06054e] text-white" : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                }`}
              >
                {s}
              </Link>
            ))}
          <Link
            href={`/clubs/${clubId}/teams/manage`}
            className="rounded-full bg-yellow-400 px-4 py-2 text-sm font-bold text-[#06054e] hover:bg-yellow-500"
          >
            Manage teams
          </Link>
        </div>
      </header>

      {teams.length === 0 ? (
        <p className="rounded-3xl bg-white p-10 text-center text-lg text-slate-500 shadow">No teams for this season yet.</p>
      ) : (
        <>
          {/* Jump links */}
          <nav aria-label="Team categories" className="flex flex-wrap gap-2">
            {byCategory.map(([c, list]) => (
              <a key={c} href={`#${c}`} className="rounded-full bg-white px-4 py-2 text-sm font-bold text-[#06054e] shadow ring-1 ring-slate-200 hover:bg-slate-50">
                {TEAM_CATEGORY_LABEL[c]} <span className="text-slate-400">{list.length}</span>
              </a>
            ))}
          </nav>

          {byCategory.map(([c, list]) => (
            <section key={c} id={c} aria-labelledby={`${c}-h`} className="scroll-mt-24">
              <h2 id={`${c}-h`} className="mb-4 text-2xl font-black uppercase text-[#06054e]">
                {TEAM_CATEGORY_LABEL[c]}
              </h2>
              <div className="grid gap-6 lg:grid-cols-2">
                {list.map((t) => (
                  <ClubTeamCard key={t.teamId} team={t} clubId={clubId} />
                ))}
              </div>
            </section>
          ))}
        </>
      )}
    </div>
  );
}
