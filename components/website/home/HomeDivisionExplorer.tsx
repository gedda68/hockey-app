"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";

export type StandingsTeamLite = {
  club: string;
  icon: string;
  pts: number;
};

export type DivisionLite = {
  divisionName: string;
  slug: string;
  teams: StandingsTeamLite[];
};

export type UpcomingLite = {
  matchId: string;
  division: string;
  dateTime: string;
  venue: string;
  homeTeam: { name: string; icon?: string };
  awayTeam: { name: string; icon?: string };
};

export default function HomeDivisionExplorer({
  divisions,
  upcoming,
}: {
  divisions: DivisionLite[];
  upcoming: UpcomingLite[];
}) {
  const [idx, setIdx] = useState(0);
  const division = divisions[idx] ?? divisions[0];
  const divisionName = division?.divisionName ?? "";

  const filteredUpcoming = useMemo(
    () =>
      upcoming.filter(
        (m) => !divisionName || m.division === divisionName,
      ),
    [upcoming, divisionName],
  );

  const topStandings = (division?.teams ?? []).slice(0, 8);
  const slice = filteredUpcoming.slice(0, 6);

  if (!division) {
    return (
      <p className="text-slate-500 text-sm">
        Division data will appear when the season ladder is available.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <h2 className="text-2xl font-black uppercase text-[#06054e]">
          Fixtures & ladder
        </h2>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
            Division
          </label>
          <select
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-800 shadow-sm min-w-[200px]"
            value={idx}
            onChange={(e) => setIdx(Number(e.target.value))}
          >
            {divisions.map((d, i) => (
              <option key={d.slug || d.divisionName} value={i}>
                {d.divisionName}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-black uppercase text-slate-600">
              Upcoming in {divisionName}
            </h3>
            <Link
              href="/competitions/matches"
              className="text-xs font-black uppercase text-slate-500 hover:text-[#06054e]"
            >
              All fixtures →
            </Link>
          </div>
          {slice.length === 0 ? (
            <p className="text-sm text-slate-500 rounded-2xl border border-dashed border-slate-200 p-6 text-center">
              No upcoming games in this division.
            </p>
          ) : (
            <ul className="space-y-3">
              {slice.map((m) => (
                <li
                  key={m.matchId}
                  className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm"
                >
                  <div className="text-[10px] font-bold uppercase text-slate-400 mb-2">
                    {new Date(m.dateTime).toLocaleString("en-AU", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    · {m.venue}
                  </div>
                  <div className="flex items-center justify-between gap-2 text-sm font-black">
                    <span className="truncate">{m.homeTeam.name}</span>
                    <span className="text-slate-400 shrink-0">v</span>
                    <span className="truncate text-right">{m.awayTeam.name}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-black uppercase text-slate-600">
              Standings · {divisionName}
            </h3>
            <Link
              href="/competitions/standings"
              className="text-xs font-black uppercase text-slate-500 hover:text-[#06054e]"
            >
              Full ladder →
            </Link>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="divide-y divide-slate-100">
              {topStandings.map((team, i) => (
                <div
                  key={team.club}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50"
                >
                  <span className="w-6 text-center text-xs font-black text-slate-400">
                    {i + 1}
                  </span>
                  <div className="relative w-7 h-7 flex-shrink-0">
                    <Image
                      src={team.icon}
                      alt=""
                      fill
                      className="object-contain"
                    />
                  </div>
                  <div className="flex-1 min-w-0 text-sm font-bold truncate">
                    {team.club}
                  </div>
                  <div className="text-sm font-black text-[#06054e]">{team.pts}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
