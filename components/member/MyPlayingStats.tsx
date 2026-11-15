// components/member/MyPlayingStats.tsx
// "My playing stats" for the member dashboard: all-time and this season, per team, season by season.

"use client";

import { useEffect, useState } from "react";
import { Trophy } from "lucide-react";
import type { PlayingStats } from "@/lib/members/playingStats";

type Resp = PlayingStats & { isPlayer: boolean };

function Tile({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
      <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">{label}</p>
      <p className="text-3xl font-black text-[#06054e] mt-1">{value}</p>
      {sub && <p className="text-xs font-semibold text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

const record = (t: PlayingStats["allTime"]) => (t.wins + t.draws + t.losses > 0 ? `${t.wins}W ${t.draws}D ${t.losses}L` : "—");

export default function MyPlayingStats() {
  const [d, setD] = useState<Resp | null>(null);

  useEffect(() => {
    let live = true;
    fetch("/api/member/my-stats", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (live) setD(j); })
      .catch(() => {});
    return () => { live = false; };
  }, []);

  if (!d || (!d.isPlayer && d.allTime.games === 0)) return null;
  const { allTime: a, thisSeason: s } = d;

  return (
    <div className="space-y-4">
      <h2 className="text-xs font-black uppercase text-slate-400 tracking-widest">My playing stats</h2>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Tile label="Games · all time" value={a.games} />
        <Tile label="Goals · all time" value={a.goals} sub={`${a.goalsPerGame} per game`} />
        <Tile label={`Games · ${d.season}`} value={s.games} />
        <Tile label={`Goals · ${d.season}`} value={s.goals} sub={`${s.goalsPerGame} per game`} />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <h3 className="text-sm font-black uppercase text-slate-500 flex items-center gap-2 mb-4"><Trophy size={14} /> {d.season} by team</h3>
        {d.byTeam.length === 0 ? (
          <p className="text-sm text-slate-400">No games recorded this season yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-slate-100 text-xs font-black uppercase text-slate-400">
                  <th className="text-left py-2 pr-3">Team</th>
                  <th className="text-center py-2 px-3">Games</th>
                  <th className="text-center py-2 px-3">Goals</th>
                  <th className="text-center py-2 px-3">Assists</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {d.byTeam.map((t) => (
                  <tr key={t.teamId}>
                    <td className="py-2 pr-3 font-bold text-slate-700">{t.team}</td>
                    <td className="py-2 px-3 text-center font-bold">{t.games}</td>
                    <td className="py-2 px-3 text-center font-bold">{t.goals}</td>
                    <td className="py-2 px-3 text-center text-slate-500">{t.assists}</td>
                  </tr>
                ))}
                <tr className="border-t-2 border-slate-200 bg-slate-50">
                  <td className="py-2 pr-3 font-black text-slate-800">Total</td>
                  <td className="py-2 px-3 text-center font-black">{s.games}</td>
                  <td className="py-2 px-3 text-center font-black">{s.goals}</td>
                  <td className="py-2 px-3 text-center font-black">{s.assists}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Tile label="Assists · all time" value={a.assists} sub={`${s.assists} in ${d.season}`} />
        <Tile label="Record · all time" value={record(a)} sub={s.games ? `${record(s)} in ${d.season}` : undefined} />
        <Tile label="Starts / off the bench" value={`${a.starts} / ${a.subAppearances}`} />
        <Tile label="Most goals in a game" value={a.mostGoalsInAGame} sub={a.captainGames ? `Captain ${a.captainGames} games` : undefined} />
      </div>

      {d.bySeason.length > 1 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h3 className="text-sm font-black uppercase text-slate-500 mb-3">Season by season</h3>
          <div className="flex flex-wrap gap-3">
            {d.bySeason.map((r) => (
              <div key={r.year} className="rounded-xl border border-slate-100 px-4 py-2 text-center min-w-[5.5rem]">
                <p className="text-xs font-black text-slate-400">{r.year}</p>
                <p className="text-sm font-black text-slate-800">{r.games} gp · {r.goals} g</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
