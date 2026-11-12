// app/(website)/clubs/[clubId]/fixtures/page.tsx
// Upcoming fixtures for every team in the club, separated into Men, Women,
// Masters Men, Masters Women, Junior Boys and Junior Girls.

import Link from "next/link";
import { notFound } from "next/navigation";
import clientPromise from "@/lib/mongodb";
import {
  getClubUpcomingFixtures,
  resolveClub,
  TEAM_CATEGORY_LABEL,
  TEAM_CATEGORY_ORDER,
  type ClubFixture,
} from "@/lib/clubs/clubPortalData";

export const dynamic = "force-dynamic";

const TZ = "Australia/Brisbane";

export default async function ClubFixturesPage({ params }: { params: Promise<{ clubId: string }> }) {
  const { clubId } = await params;
  const db = (await clientPromise).db(process.env.DB_NAME || "hockey-app");
  const club = await resolveClub(db, clubId);
  if (!club) notFound();

  const fixtures = await getClubUpcomingFixtures(db, club);
  const categories = TEAM_CATEGORY_ORDER.map((c) => [c, fixtures.filter((f) => f.category === c)] as const);
  const withFixtures = categories.filter(([, list]) => list.length);

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6 md:p-8">
      <header>
        <h1 className="text-4xl font-black text-[#06054e]">Fixtures</h1>
        <p className="mt-1 text-lg font-semibold text-slate-600">
          Upcoming games for every {String(club.shortName || club.name)} team
        </p>
      </header>

      <nav aria-label="Fixture categories" className="flex flex-wrap gap-2">
        {categories.map(([c, list]) => (
          <a
            key={c}
            href={list.length ? `#${c}` : undefined}
            aria-disabled={!list.length}
            className={`rounded-full px-4 py-2 text-sm font-bold shadow ring-1 ring-slate-200 ${
              list.length ? "bg-white text-[#06054e] hover:bg-slate-50" : "cursor-default bg-slate-100 text-slate-400"
            }`}
          >
            {TEAM_CATEGORY_LABEL[c]} <span className="text-slate-400">{list.length}</span>
          </a>
        ))}
      </nav>

      {withFixtures.length === 0 ? (
        <div className="rounded-3xl bg-white p-10 text-center shadow-xl">
          <p className="text-xl font-black text-[#06054e]">No upcoming fixtures</p>
          <p className="mt-2 text-slate-600">The draw for the next round hasn&rsquo;t been published yet, or the season has finished.</p>
          <Link href={`/clubs/${clubId}/teams`} className="mt-4 inline-block rounded-full bg-[#06054e] px-5 py-2 text-sm font-bold text-white hover:bg-[#1a1870]">
            See teams and past matches
          </Link>
        </div>
      ) : (
        withFixtures.map(([c, list]) => (
          <section key={c} id={c} aria-labelledby={`${c}-h`} className="scroll-mt-24">
            <h2 id={`${c}-h`} className="mb-4 text-2xl font-black uppercase text-[#06054e]">
              {TEAM_CATEGORY_LABEL[c]}
            </h2>
            <div className="grid gap-6 lg:grid-cols-2">
              {groupByTeam(list).map(([teamName, games]) => (
                <article key={teamName} className="overflow-hidden rounded-3xl bg-white shadow-xl ring-1 ring-slate-100">
                  <header className="flex items-center justify-between bg-gradient-to-r from-blue-700 to-blue-500 px-6 py-3 text-white">
                    <Link href={`/clubs/${clubId}/teams/${encodeURIComponent(games[0]!.teamId)}`} className="text-lg font-black hover:underline">
                      {teamName}
                    </Link>
                    <span className="text-sm font-semibold text-white/80">{games[0]!.competition}</span>
                  </header>
                  <ul className="divide-y divide-slate-100">
                    {games.map((g) => (
                      <li key={`${g.fixtureId}-${g.teamId}`}>
                        <Link href={`/competitions/matches/${encodeURIComponent(g.fixtureId)}`} className="grid grid-cols-[5.5rem_1fr_auto] items-center gap-4 px-6 py-3 hover:bg-slate-50">
                          <span className="text-center">
                            <span className="block text-xs font-bold uppercase text-slate-500">
                              {g.dateTime ? new Date(g.dateTime).toLocaleDateString("en-AU", { weekday: "short", timeZone: TZ }) : "TBC"}
                            </span>
                            <span className="block text-lg font-black text-[#06054e]">
                              {g.dateTime ? new Date(g.dateTime).toLocaleDateString("en-AU", { day: "numeric", month: "short", timeZone: TZ }) : ""}
                            </span>
                            <span className="block text-xs font-semibold text-slate-500">
                              {g.dateTime ? new Date(g.dateTime).toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit", timeZone: TZ }) : ""}
                            </span>
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-base font-bold text-slate-900">
                              {g.isHome ? "vs" : "@"} {g.opponent}
                            </span>
                            <span className="block truncate text-sm text-slate-500">
                              {g.round != null ? `Round ${g.round}` : ""}
                              {g.venue ? `${g.round != null ? " · " : ""}${g.venue}` : ""}
                            </span>
                          </span>
                          <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${g.isHome ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>
                            {g.isHome ? "Home" : "Away"}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

function groupByTeam(list: ClubFixture[]): [string, ClubFixture[]][] {
  const map = new Map<string, ClubFixture[]>();
  for (const f of list) map.set(f.teamName, [...(map.get(f.teamName) ?? []), f]);
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b, "en", { numeric: true }));
}
