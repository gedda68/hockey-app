// components/member/MyPlayingStats.tsx
// "My playing stats" for the member dashboard: all-time and this season, per team, season by season.

"use client";

import { useEffect, useState } from "react";
import { Trophy } from "lucide-react";
import type { PlayingStats } from "@/lib/members/playingStats";
import type { Milestones, CompetitionRank, RepAppearance, MembershipLength } from "@/lib/members/playingExtras";

type Resp = PlayingStats & {
  isPlayer: boolean;
  milestones: Milestones;
  awards: { playerOfMatch: number; playerOfCompetition: number; topGoalScorer: number };
  competitionRanks: CompetitionRank[];
  repAppearances: RepAppearance[];
  membership: MembershipLength;
  attendance: { tracked: boolean };
  availability: { tracked: boolean };
};

function Tile({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
      <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">{label}</p>
      <p className="text-3xl font-black text-[#06054e] mt-1">{value}</p>
      {sub && <p className="text-xs font-semibold text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

const ordinalRank = (n: number) => {
  const v = n % 100;
  return v >= 11 && v <= 13 ? `${n}th` : `${n}${["th", "st", "nd", "rd"][n % 10 > 3 ? 0 : n % 10]}`;
};

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

      {/* Milestones */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <h3 className="text-sm font-black uppercase text-slate-500 mb-3">Milestones</h3>
        <div className="flex flex-wrap gap-3 items-center">
          {d.milestones.badges.length === 0 && <p className="text-sm text-slate-400">Your first badge is your 50th game.</p>}
          {d.milestones.badges.map((b) => (
            <div key={b.games} title={`${b.games} games played`} className="flex flex-col items-center justify-center h-20 w-20 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 text-white shadow">
              <span className="text-xl font-black leading-none">{b.games}</span>
              <span className="text-[9px] font-black uppercase tracking-wide">games</span>
            </div>
          ))}
          <p className="text-xs font-semibold text-slate-400 ml-1">
            {d.milestones.next.remaining} game{d.milestones.next.remaining === 1 ? "" : "s"} to your {d.milestones.next.games}th
          </p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          <Tile label="Player of the match" value={d.awards.playerOfMatch} sub={d.awards.playerOfMatch === 0 ? "None recorded yet" : undefined} />
          <Tile label="Player of the competition" value={d.awards.playerOfCompetition} />
          <Tile label="Top scorer awards" value={d.awards.topGoalScorer} />
        </div>
      </div>

      {/* Top-scorer rank */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <h3 className="text-sm font-black uppercase text-slate-500 mb-3">Top-scorer rank · {d.season}</h3>
        {d.competitionRanks.length === 0 ? (
          <p className="text-sm text-slate-400">You&apos;ll appear here once you&apos;ve scored in a competition this season.</p>
        ) : (
          <ul className="space-y-2">
            {d.competitionRanks.map((c) => (
              <li key={c.seasonCompetitionId} className="flex items-center justify-between text-sm">
                <span className="font-bold text-slate-700">{c.competition}</span>
                <span className="font-black text-[#06054e]">{ordinalRank(c.rank)} <span className="font-semibold text-slate-400">of {c.of} · {c.goals} goal{c.goals === 1 ? "" : "s"}</span></span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Participation */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4">
        <h3 className="text-sm font-black uppercase text-slate-500">Participation</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Tile label="Years a member" value={d.membership.sinceYear ? d.membership.years : "—"} sub={d.membership.sinceYear ? `Since ${d.membership.sinceYear}` : "Join date not recorded"} />
          <Tile label="Representative" value={d.repAppearances.length} sub="selections & tournaments" />
          <Tile label="Training attendance" value="—" sub={d.attendance.tracked ? undefined : "Coming soon — not tracked yet"} />
          <Tile label="Match availability" value="—" sub={d.availability.tracked ? undefined : "Coming soon — not tracked yet"} />
        </div>
        {d.repAppearances.length > 0 && (
          <ul className="space-y-1">
            {d.repAppearances.map((r, i) => (
              <li key={i} className="text-sm font-semibold text-slate-700">
                <span className="text-slate-400 font-black mr-2">{r.year}</span>{r.label}
              </li>
            ))}
          </ul>
        )}
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
