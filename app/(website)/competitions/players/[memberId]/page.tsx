import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicPlayerProfile } from "@/lib/data/publicPlayer";

export const dynamic = "force-dynamic";

export default async function PublicPlayerPage({ params }: { params: Promise<{ memberId: string }> }) {
  const { memberId } = await params;
  const p = await getPublicPlayerProfile(decodeURIComponent(memberId));
  if (!p) notFound();

  const initials = p.name.split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  const accent = p.club ?? { primary: "#06054e", secondary: "#1a1870" };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#06054e] via-slate-900 to-slate-800 px-4 py-10 md:px-8">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/competitions/standings"
          className="inline-flex text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-white"
        >
          ← Back to standings
        </Link>

        {/* Profile header */}
        <section className="mt-6 overflow-hidden rounded-3xl bg-white shadow-2xl">
          <div
            className="flex flex-col gap-6 px-6 py-8 text-white sm:flex-row sm:items-center md:px-10"
            style={{ background: `linear-gradient(120deg, ${accent.primary}, ${accent.secondary})` }}
          >
            <div className="relative shrink-0">
              {p.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.photoUrl} alt="" className="h-28 w-28 rounded-full object-cover ring-4 ring-white/40" />
              ) : (
                <span className="flex h-28 w-28 items-center justify-center rounded-full bg-white/20 text-4xl font-black ring-4 ring-white/40">
                  {initials}
                </span>
              )}
              {p.usualShirtNumber != null && (
                <span className="absolute -bottom-1 -right-1 flex h-10 min-w-10 items-center justify-center rounded-full bg-yellow-300 px-2 text-lg font-black text-slate-900 ring-4 ring-white">
                  {p.usualShirtNumber}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <h1 className="text-3xl font-black md:text-4xl">{p.name}</h1>
              <p className="mt-2 flex items-center gap-2 text-lg font-semibold text-white/90">
                {p.club?.logo && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.club.logo} alt="" className="h-7 w-7 rounded-full bg-white object-contain p-0.5" />
                )}
                {p.club?.name ?? "Club not recorded"}
                {p.isGoalkeeper && <span className="rounded-full bg-white/20 px-3 py-0.5 text-sm">Goalkeeper</span>}
              </p>
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-px bg-slate-200 sm:grid-cols-5">
            {[
              ["Games", p.career.appearances],
              ["Goals", p.career.goals],
              ["Green cards", p.career.greenCards],
              ["Yellow cards", p.career.yellowCards],
              ["Red cards", p.career.redCards],
            ].map(([label, value]) => (
              <div key={String(label)} className="bg-white px-4 py-5 text-center">
                <dt className="text-xs font-semibold uppercase tracking-widest text-slate-500">{label}</dt>
                <dd className="mt-1 text-3xl font-black tabular-nums text-[#06054e]">{value}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Seasons */}
        <section className="mt-8 overflow-hidden rounded-3xl bg-white shadow-xl">
          <h2 className="bg-gradient-to-r from-blue-700 to-blue-500 px-6 py-4 text-xl font-black text-white">Competitions</h2>
          {p.seasons.length === 0 ? (
            <p className="px-6 py-10 text-center text-slate-500">No games recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-base text-slate-800">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
                    <th scope="col" className="py-3 pl-6 text-left">Season</th>
                    <th scope="col" className="py-3 text-left">Competition</th>
                    <th scope="col" className="py-3 text-left">Team</th>
                    <th scope="col" className="w-16 py-3 text-center">Games</th>
                    <th scope="col" className="w-16 py-3 text-center">Goals</th>
                    <th scope="col" className="w-24 py-3 pr-6 text-center">Cards</th>
                  </tr>
                </thead>
                <tbody>
                  {p.seasons.map((s) => (
                    <tr key={s.seasonCompetitionId} className="border-b border-slate-100 hover:bg-indigo-50/60">
                      <td className="py-3 pl-6 font-semibold tabular-nums">{s.season}</td>
                      <td className="py-3">
                        <Link
                          href={`/competitions/standings?seasonCompetitionId=${encodeURIComponent(s.seasonCompetitionId)}`}
                          className="font-semibold text-[#06054e] underline-offset-4 hover:underline"
                        >
                          {s.competitionName}
                        </Link>
                      </td>
                      <td className="py-3 text-slate-600">{s.teamName ?? "—"}</td>
                      <td className="py-3 text-center tabular-nums">{s.appearances}</td>
                      <td className="py-3 text-center font-bold tabular-nums">{s.totals?.goals ?? 0}</td>
                      <td className="py-3 pr-6">
                        <CardTally green={s.totals?.greenCards ?? 0} yellow={s.totals?.yellowCards ?? 0} red={s.totals?.redCards ?? 0} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Recent matches */}
        {p.recentMatches.length > 0 && (
          <section className="mt-8 overflow-hidden rounded-3xl bg-white shadow-xl">
            <h2 className="bg-gradient-to-r from-blue-700 to-blue-500 px-6 py-4 text-xl font-black text-white">Recent matches</h2>
            <ul className="divide-y divide-slate-100">
              {p.recentMatches.map((m) => {
                const res =
                  m.teamScore == null || m.opponentScore == null ? null : m.teamScore > m.opponentScore ? "W" : m.teamScore < m.opponentScore ? "L" : "D";
                return (
                  <li key={m.fixtureId}>
                    <Link
                      href={`/competitions/matches/${encodeURIComponent(m.fixtureId)}`}
                      className="flex flex-wrap items-center gap-4 px-6 py-4 transition-colors hover:bg-indigo-50/60"
                    >
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-black text-white ${
                          res === "W" ? "bg-emerald-500" : res === "L" ? "bg-rose-500" : res === "D" ? "bg-slate-400" : "bg-slate-300"
                        }`}
                      >
                        {res ?? "–"}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-bold text-slate-900">
                          {m.isHome ? "vs" : "@"} {m.opponentName}
                        </span>
                        <span className="block text-sm text-slate-500">
                          {m.competitionName}
                          {m.round != null ? ` · Round ${m.round}` : ""}
                          {m.dateTime
                            ? ` · ${new Date(m.dateTime).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric", timeZone: "Australia/Brisbane" })}`
                            : ""}
                        </span>
                      </span>
                      <span className="text-xl font-black tabular-nums text-[#06054e]">
                        {m.teamScore ?? "-"} – {m.opponentScore ?? "-"}
                      </span>
                      <span className="flex w-28 justify-end gap-2 text-sm font-semibold text-slate-600">
                        {m.goals > 0 && <span>● {m.goals}</span>}
                        {m.cards.map((c, i) => (
                          <span
                            key={i}
                            className={`inline-block h-4 w-3 rounded-[3px] ${c === "red_card" ? "bg-red-500" : c === "yellow_card" ? "bg-yellow-400" : "bg-emerald-500"}`}
                            aria-label={c.replace("_", " ")}
                          />
                        ))}
                        {m.shirtNumber != null && <span className="text-slate-400">#{m.shirtNumber}</span>}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}

function CardTally({ green, yellow, red }: { green: number; yellow: number; red: number }) {
  if (!green && !yellow && !red) return <span className="block text-center text-slate-400">—</span>;
  return (
    <span className="flex items-center justify-center gap-2 text-sm font-semibold tabular-nums">
      {green > 0 && <span className="flex items-center gap-1"><i className="inline-block h-4 w-3 rounded-[3px] bg-emerald-500" aria-label="green cards" />{green}</span>}
      {yellow > 0 && <span className="flex items-center gap-1"><i className="inline-block h-4 w-3 rounded-[3px] bg-yellow-400" aria-label="yellow cards" />{yellow}</span>}
      {red > 0 && <span className="flex items-center gap-1"><i className="inline-block h-4 w-3 rounded-[3px] bg-red-500" aria-label="red cards" />{red}</span>}
    </span>
  );
}
