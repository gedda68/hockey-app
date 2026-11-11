// components/clubs/ClubPeopleList.tsx
// List of a club's active coaches or players, each with a pill per team that
// links to the team's own page.

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ClubPerson } from "@/lib/clubs/clubPortalData";

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");

export default function ClubPeopleList({
  clubId,
  kind,
  people,
}: {
  clubId: string;
  kind: "coach" | "player";
  people: ClubPerson[];
}) {
  const teamCount = new Set(people.flatMap((p) => p.teams.map((t) => t.teamId))).size;
  const noun = kind === "coach" ? ["coach", "coaches"] : ["player", "players"];
  const avatar = kind === "coach" ? "bg-orange-100 text-orange-700" : "bg-purple-100 text-purple-700";

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6 md:p-8">
      <Link href={`/clubs/${clubId}`} className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-[#06054e]">
        <ArrowLeft size={16} /> Dashboard
      </Link>

      <header>
        <h1 className="text-4xl font-black capitalize text-[#06054e]">{noun[1]}</h1>
        <p className="mt-1 text-lg font-semibold text-slate-600">
          {people.length} active {people.length === 1 ? noun[0] : noun[1]}
          {teamCount ? ` across ${teamCount} team${teamCount === 1 ? "" : "s"}` : ""}
        </p>
      </header>

      {people.length === 0 ? (
        <p className="rounded-3xl bg-white p-10 text-center text-lg text-slate-500 shadow">No active {noun[1]}.</p>
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-3xl bg-white shadow-xl ring-1 ring-slate-100">
          {people.map((p) => (
            <li key={p.memberId} className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center">
              <div className="flex min-w-0 items-center gap-3 sm:w-72 sm:shrink-0">
                {p.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.photoUrl} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover" />
                ) : (
                  <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-black ${avatar}`}>
                    {initials(p.name)}
                  </span>
                )}
                <div className="min-w-0">
                  {kind === "player" ? (
                    <Link href={`/competitions/players/${encodeURIComponent(p.memberId)}`} className="block truncate text-lg font-black text-slate-900 hover:underline">
                      {p.name}
                    </Link>
                  ) : (
                    <p className="truncate text-lg font-black text-slate-900">{p.name}</p>
                  )}
                  <p className="truncate text-sm font-semibold text-slate-500">{p.roles.join(" · ")}</p>
                </div>
              </div>

              {p.teams.length ? (
                <ul className="flex flex-wrap gap-2">
                  {p.teams.map((t) => {
                    const extra =
                      kind === "coach"
                        ? /^coach$/i.test(t.role) ? null : t.role
                        : [t.role === "Goalkeeper" ? "GK" : null, t.games ? `${t.games} gm${t.games === 1 ? "" : "s"}` : null].filter(Boolean).join(" · ") || null;
                    return (
                      <li key={t.teamId}>
                        <Link
                          href={`/clubs/${clubId}/teams/${encodeURIComponent(t.teamId)}`}
                          className="inline-flex items-center gap-1.5 rounded-full bg-[#06054e] px-3 py-1.5 text-sm font-bold text-white hover:bg-blue-800"
                          title={`${t.role}${t.season ? ` · ${t.season}` : ""}`}
                        >
                          {t.name}
                          {t.season && <span className="font-semibold text-white/60">{t.season}</span>}
                          {extra && <span className="font-semibold text-yellow-300">· {extra}</span>}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <span className="text-sm font-semibold italic text-slate-400">
                  {kind === "coach" ? "No team assigned" : "Not selected in a team"}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
