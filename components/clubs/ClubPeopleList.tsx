// components/clubs/ClubPeopleList.tsx
// List of a club's active coaches or players, each with a pill per team that
// links to the team's own page.

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ClubPerson } from "@/lib/clubs/clubPortalData";
import { filterPeople } from "@/lib/clubs/peopleSearch";
import ClubPeopleSearch from "./ClubPeopleSearch";

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");

export const PEOPLE_PAGE_SIZE = 25;

export default function ClubPeopleList({
  clubId,
  kind,
  people,
  page: requestedPage = 1,
  query = "",
}: {
  clubId: string;
  kind: "coach" | "player";
  people: ClubPerson[];
  /** 1-based page number (25 rows per page). */
  page?: number;
  /** Search text (?q=): name or team. */
  query?: string;
}) {
  const q = query.trim();
  const shown = filterPeople(people, q);
  const pageCount = Math.max(1, Math.ceil(shown.length / PEOPLE_PAGE_SIZE));
  const page = Math.min(Math.max(1, Math.floor(requestedPage) || 1), pageCount);
  const first = (page - 1) * PEOPLE_PAGE_SIZE;
  const rows = shown.slice(first, first + PEOPLE_PAGE_SIZE);
  const basePath = `/clubs/${clubId}/${kind === "coach" ? "coaches" : "players"}`;
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

      {people.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <ClubPeopleSearch
            basePath={basePath}
            initialQuery={q}
            placeholder={`Search ${noun[1]} by name or team…`}
            options={people.map((p) => ({ memberId: p.memberId, name: p.name, teams: [...new Set(p.teams.map((t) => t.name))] }))}
          />
          {q && (
            <p className="text-sm font-semibold text-slate-600">
              {shown.length} match{shown.length === 1 ? "" : "es"} for &ldquo;{q}&rdquo; ·{" "}
              <Link href={basePath} className="text-blue-700 hover:underline">
                Show all
              </Link>
            </p>
          )}
        </div>
      )}

      {people.length === 0 ? (
        <p className="rounded-3xl bg-white p-10 text-center text-lg text-slate-500 shadow">No active {noun[1]}.</p>
      ) : shown.length === 0 ? (
        <p className="rounded-3xl bg-white p-10 text-center text-lg text-slate-500 shadow">
          No {noun[1]} match &ldquo;{q}&rdquo;.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-3xl bg-white shadow-xl ring-1 ring-slate-100">
          {rows.map((p) => (
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

      {pageCount > 1 && (
        <Pagination basePath={basePath} query={q} page={page} pageCount={pageCount} first={first + 1} last={first + rows.length} total={shown.length} />
      )}
    </div>
  );
}

/** Page numbers to show: first, last and a window around the current page. */
export function pageWindow(page: number, pageCount: number): (number | "…")[] {
  const keep = new Set([1, pageCount, page - 1, page, page + 1].filter((n) => n >= 1 && n <= pageCount));
  const out: (number | "…")[] = [];
  let prev = 0;
  for (const n of [...keep].sort((a, b) => a - b)) {
    if (n - prev > 1) out.push("…");
    out.push(n);
    prev = n;
  }
  return out;
}

function Pagination({ basePath, query, page, pageCount, first, last, total }: { basePath: string; query: string; page: number; pageCount: number; first: number; last: number; total: number }) {
  const href = (n: number) => {
    const sp = new URLSearchParams();
    if (query) sp.set("q", query);
    if (n > 1) sp.set("page", String(n));
    const qs = sp.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };
  const btn = "flex h-10 min-w-10 items-center justify-center rounded-full px-3 text-sm font-bold";
  return (
    <nav aria-label="Pagination" className="flex flex-col items-center justify-between gap-3 sm:flex-row">
      <p className="text-sm font-semibold text-slate-500">
        Showing {first}–{last} of {total}
      </p>
      <ul className="flex flex-wrap items-center gap-1">
        <li>
          {page > 1 ? (
            <Link href={href(page - 1)} className={`${btn} bg-white text-[#06054e] ring-1 ring-slate-200 hover:bg-slate-50`}>
              ‹ Prev
            </Link>
          ) : (
            <span className={`${btn} bg-slate-100 text-slate-400`} aria-disabled="true">‹ Prev</span>
          )}
        </li>
        {pageWindow(page, pageCount).map((n, i) => (
          <li key={`${n}-${i}`}>
            {n === "…" ? (
              <span className="px-1 text-slate-400">…</span>
            ) : n === page ? (
              <span aria-current="page" className={`${btn} bg-[#06054e] text-white`}>{n}</span>
            ) : (
              <Link href={href(n)} className={`${btn} bg-white text-[#06054e] ring-1 ring-slate-200 hover:bg-slate-50`}>
                {n}
              </Link>
            )}
          </li>
        ))}
        <li>
          {page < pageCount ? (
            <Link href={href(page + 1)} className={`${btn} bg-white text-[#06054e] ring-1 ring-slate-200 hover:bg-slate-50`}>
              Next ›
            </Link>
          ) : (
            <span className={`${btn} bg-slate-100 text-slate-400`} aria-disabled="true">Next ›</span>
          )}
        </li>
      </ul>
    </nav>
  );
}
