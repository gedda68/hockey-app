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
  type ClubTeamOverview,
  type ClubTeamPerson,
} from "@/lib/clubs/clubPortalData";

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
                  <TeamCard key={t.teamId} team={t} clubId={clubId} />
                ))}
              </div>
            </section>
          ))}
        </>
      )}
    </div>
  );
}

function TeamCard({ team: t, clubId }: { team: ClubTeamOverview; clubId: string }) {
  const current = t.players.filter((p) => p.inLatestLineup);
  const others = t.players.filter((p) => !p.inLatestLineup);
  return (
    <article className="overflow-hidden rounded-3xl bg-white shadow-xl ring-1 ring-slate-100">
      <header className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-blue-700 to-blue-500 px-6 py-4 text-white">
        <div className="min-w-0">
          <Link href={`/clubs/${clubId}/teams/${encodeURIComponent(t.teamId)}`} className="block truncate text-xl font-black hover:underline">
            {t.name}
          </Link>
          <p className="text-sm font-semibold text-white/80">
            {[t.grade, t.season].filter(Boolean).join(" · ")} · {t.players.length} players
          </p>
        </div>
        <div className="flex gap-2">
          {t.seasonCompetitionId && (
            <Link
              href={`/competitions/matches?view=results&seasonCompetitionId=${encodeURIComponent(t.seasonCompetitionId)}&teamId=${encodeURIComponent(t.teamId)}&round=All&status=All`}
              className="rounded-lg bg-white/15 px-3 py-1.5 text-xs font-bold hover:bg-white/25"
            >
              Matches
            </Link>
          )}
          {t.seasonCompetitionId && (
            <Link
              href={`/competitions/standings?seasonCompetitionId=${encodeURIComponent(t.seasonCompetitionId)}`}
              className="rounded-lg bg-white/15 px-3 py-1.5 text-xs font-bold hover:bg-white/25"
            >
              Ladder
            </Link>
          )}
        </div>
      </header>

      <div className="space-y-5 p-6">
        {t.staff.length > 0 && (
          <div>
            <h3 className="mb-2 text-xs font-black uppercase tracking-widest text-slate-400">Coaching staff</h3>
            <ul className="flex flex-wrap gap-2">
              {t.staff.map((s) => (
                <li key={s.memberId}>
                  <Link
                    href={`/clubs/${clubId}/members/${encodeURIComponent(s.memberId)}`}
                    className="inline-flex items-center gap-1.5 rounded-full bg-orange-100 px-3 py-1 text-sm font-bold text-orange-900 hover:bg-orange-200"
                  >
                    {s.name} <span className="font-semibold text-orange-700">· {s.role}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        <PlayerGroup
          title={
            t.latestMatch
              ? `Latest team sheet${t.latestMatch.dateTime ? ` · ${new Date(t.latestMatch.dateTime).toLocaleDateString("en-AU", { day: "numeric", month: "short", timeZone: "Australia/Brisbane" })}` : ""}`
              : "Players"
          }
          titleHref={t.latestMatch ? `/competitions/matches/${encodeURIComponent(t.latestMatch.fixtureId)}` : undefined}
          players={t.latestMatch ? current : t.players}
        />
        {t.latestMatch && others.length > 0 && <PlayerGroup title="Also played / registered this season" players={others} muted />}
      </div>
    </article>
  );
}

function PlayerGroup({ title, titleHref, players, muted }: { title: string; titleHref?: string; players: ClubTeamPerson[]; muted?: boolean }) {
  if (!players.length) return null;
  return (
    <div>
      <h3 className="mb-2 text-xs font-black uppercase tracking-widest text-slate-400">
        {titleHref ? (
          <Link href={titleHref} className="hover:text-[#06054e] hover:underline">
            {title}
          </Link>
        ) : (
          title
        )}
      </h3>
      <ul className="grid gap-1 sm:grid-cols-2">
        {players.map((p) => (
          <li key={p.memberId}>
            <Link
              href={`/competitions/players/${encodeURIComponent(p.memberId)}`}
              className={`flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm hover:bg-slate-100 ${muted ? "text-slate-500" : "text-slate-900"}`}
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#06054e] text-xs font-black text-white tabular-nums">
                {p.shirtNumber ?? "–"}
              </span>
              <span className="min-w-0 flex-1 truncate font-semibold">
                {p.name}
                {p.isGoalkeeper || p.isCaptain ? (
                  <span className="ml-1 text-xs font-bold text-amber-600">
                    ({[p.isGoalkeeper ? "GK" : "", p.isCaptain ? "C" : ""].filter(Boolean).join(", ")})
                  </span>
                ) : null}
              </span>
              <span className="shrink-0 text-xs font-semibold text-slate-400">
                {p.games ? `${p.games} gm${p.games === 1 ? "" : "s"}` : p.registered ? "Registered" : ""}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
