import Link from "next/link";
import type { Division, Team } from "../../types";

interface StandingsTableFullProps {
  division: Division | null;
  currentYear: string;
}

const num = (...v: (number | undefined)[]) => v.find((x) => typeof x === "number") ?? 0;

/** Link to every match this team played in the selected season competition. */
export function teamMatchesHref(seasonCompetitionId: string | undefined, team: Team): string | null {
  if (!seasonCompetitionId || !team.teamId) return null;
  const q = new URLSearchParams({
    view: "results",
    seasonCompetitionId,
    teamId: team.teamId,
    round: "All",
    status: "All",
  });
  return `/competitions/matches?${q.toString()}`;
}

function TeamBadge({ team }: { team: Team }) {
  if (team.icon) {
    // Plain <img>: club logos may be local (/icons/…) or remote (Altius CDN)
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={team.icon} alt="" className="h-9 w-9 shrink-0 rounded-full bg-white object-contain p-0.5 ring-1 ring-slate-200" />;
  }
  const initials = team.club.replace(/[^A-Za-z ]/g, "").split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("");
  return (
    <span
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
      style={{ background: team.primaryColor || "#06054e" }}
      aria-hidden
    >
      {initials}
    </span>
  );
}

export default function StandingsTableFull({ division, currentYear }: StandingsTableFullProps) {
  const teams = division?.teams ?? [];
  const finalsPlaces = division?.finalsPlaces ?? 0;
  const played = teams.reduce((s, t) => s + num(t.p, t.played), 0);
  const goals = teams.reduce((s, t) => s + num(t.goalsFor), 0);
  const matches = Math.round(played / 2);

  return (
    <section className="overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-black/5">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-4 bg-[#06054e] px-6 py-6 text-white md:px-8">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-white/60">{currentYear} Season</p>
          <h2 className="mt-1 text-2xl font-black md:text-3xl">{division?.divisionName ?? "Standings"}</h2>
        </div>
        {finalsPlaces > 0 && teams.length > 0 && (
          <p className="flex items-center gap-2 text-sm text-white/80">
            <span className="inline-block h-3 w-3 rounded-sm bg-emerald-400" aria-hidden />
            Top {finalsPlaces} qualify for finals
          </p>
        )}
      </header>

      {teams.length === 0 ? (
        <p className="px-8 py-16 text-center text-lg text-slate-500">No standings available yet.</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-base text-slate-800">
              <caption className="sr-only">
                {division?.divisionName} ladder, {currentYear}. Select a team to see its matches.
              </caption>
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <th scope="col" className="w-14 py-3 pl-6 text-left">#</th>
                  <th scope="col" className="py-3 pl-2 text-left">Team</th>
                  <th scope="col" className="w-14 py-3 text-center" title="Played">P</th>
                  <th scope="col" className="w-14 py-3 text-center" title="Won">W</th>
                  <th scope="col" className="w-14 py-3 text-center" title="Drawn">D</th>
                  <th scope="col" className="w-14 py-3 text-center" title="Lost">L</th>
                  <th scope="col" className="hidden w-14 py-3 text-center sm:table-cell" title="Goals for">GF</th>
                  <th scope="col" className="hidden w-14 py-3 text-center sm:table-cell" title="Goals against">GA</th>
                  <th scope="col" className="w-16 py-3 text-center" title="Goal difference">GD</th>
                  <th scope="col" className="w-20 py-3 pr-6 text-right" title="Points">Pts</th>
                </tr>
              </thead>
              <tbody>
                {teams.map((t, i) => {
                  const pos = t.pos ?? i + 1;
                  const inFinals = finalsPlaces > 0 && pos <= finalsPlaces;
                  const gd = num(t.gd, t.goalDifference);
                  const href = teamMatchesHref(division?.slug, t);
                  const lastFinalist = finalsPlaces > 0 && pos === finalsPlaces && i < teams.length - 1;
                  return (
                    <tr
                      key={t.teamId ?? t.club}
                      className={`group border-b transition-colors hover:bg-indigo-50/60 ${
                        lastFinalist ? "border-b-2 border-b-emerald-400" : "border-slate-100"
                      }`}
                    >
                      <td className="py-4 pl-6">
                        <span
                          className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold tabular-nums ${
                            inFinals ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {pos}
                        </span>
                      </td>
                      <td className="py-3 pl-2 pr-4">
                        <div className="flex items-center gap-3">
                          <span
                            className="h-9 w-1 shrink-0 rounded-full"
                            style={{ background: `linear-gradient(${t.primaryColor || "#cbd5e1"}, ${t.secondaryColor || t.primaryColor || "#cbd5e1"})` }}
                            aria-hidden
                          />
                          <TeamBadge team={t} />
                          {href ? (
                            <Link
                              href={href}
                              className="truncate text-lg font-bold text-slate-900 underline-offset-4 hover:text-[#06054e] hover:underline focus-visible:underline"
                              title={`See ${t.club}'s ${currentYear} matches`}
                            >
                              {t.club}
                            </Link>
                          ) : (
                            <span className="truncate text-lg font-bold text-slate-900">{t.club}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 text-center tabular-nums">{num(t.p, t.played)}</td>
                      <td className="py-4 text-center tabular-nums">{num(t.w, t.won)}</td>
                      <td className="py-4 text-center tabular-nums">{num(t.d, t.drawn)}</td>
                      <td className="py-4 text-center tabular-nums">{num(t.l, t.lost)}</td>
                      <td className="hidden py-4 text-center tabular-nums sm:table-cell">{num(t.goalsFor)}</td>
                      <td className="hidden py-4 text-center tabular-nums sm:table-cell">{num(t.goalsAgainst)}</td>
                      <td
                        className={`py-4 text-center font-semibold tabular-nums ${
                          gd > 0 ? "text-emerald-700" : gd < 0 ? "text-rose-600" : "text-slate-500"
                        }`}
                      >
                        {gd > 0 ? `+${gd}` : gd}
                      </td>
                      <td className="py-4 pr-6 text-right text-xl font-black tabular-nums text-[#06054e]">{t.pts}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Season summary */}
          <dl className="grid grid-cols-2 gap-px border-t border-slate-200 bg-slate-200 sm:grid-cols-4">
            {[
              ["Teams", teams.length],
              ["Matches", matches],
              ["Goals", goals],
              ["Goals / match", matches ? (goals / matches).toFixed(1) : "—"],
            ].map(([label, value]) => (
              <div key={String(label)} className="bg-white px-6 py-5 text-center">
                <dt className="text-xs font-semibold uppercase tracking-widest text-slate-500">{label}</dt>
                <dd className="mt-1 text-3xl font-black tabular-nums text-[#06054e]">{value}</dd>
              </div>
            ))}
          </dl>

          <p className="border-t border-slate-100 px-6 py-3 text-sm text-slate-500">
            Ladder counts regular-season games only. Select a team to see all of its {currentYear} matches.
          </p>
        </>
      )}
    </section>
  );
}
