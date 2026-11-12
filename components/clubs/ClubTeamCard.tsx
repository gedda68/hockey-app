// components/clubs/ClubTeamCard.tsx
// A club team: coaching staff, latest team sheet and everyone else who has
// played / is registered this season. Used on the club Teams page and on the
// standalone team page.

import Link from "next/link";
import type { ClubTeamOverview, ClubTeamPerson } from "@/lib/clubs/clubPortalData";

export default function ClubTeamCard({ team: t, clubId, large }: { team: ClubTeamOverview; clubId: string; /** Standalone team page */ large?: boolean }) {
  const current = t.players.filter((p) => p.inLatestLineup);
  const others = t.players.filter((p) => !p.inLatestLineup);
  return (
    <article className="overflow-hidden rounded-3xl bg-white shadow-xl ring-1 ring-slate-100">
      <header className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-blue-700 to-blue-500 px-6 py-4 text-white">
        <div className="min-w-0">
          {large ? (
            <h1 className="truncate text-3xl font-black">{t.name}</h1>
          ) : (
            <Link href={`/clubs/${clubId}/teams/${encodeURIComponent(t.teamId)}`} className="block truncate text-xl font-black hover:underline">
              {t.name}
            </Link>
          )}
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
