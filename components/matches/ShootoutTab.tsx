"use client";

import type { Match } from "@/types";
import type { PublicMatchPlayer } from "@/lib/data/matchPlayers";
import { buildShootoutAttempts } from "@/lib/competitions/shootout";

function Mark({ scored }: { scored: boolean }) {
  return scored ? (
    <span role="img" aria-label="Scored" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 ring-2 ring-emerald-400 text-emerald-300">
      <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 10.5l3.5 3.5 7.5-8" /></svg>
    </span>
  ) : (
    <span role="img" aria-label="Missed" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-500/15 ring-2 ring-red-400 text-red-300">
      <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M5.5 5.5l9 9M14.5 5.5l-9 9" /></svg>
    </span>
  );
}

export default function ShootoutTab({
  match,
  teamNameById,
  players,
  teamColorById,
}: {
  match: Match;
  teamNameById: Record<string, string>;
  players: Record<string, PublicMatchPlayer>;
  teamColorById: Record<string, { primary: string; secondary: string }>;
}) {
  const attempts = buildShootoutAttempts(match.matchEvents);
  const teams = [match.homeTeamId, match.awayTeamId].filter((t): t is string => Boolean(t));
  const score = (teamId: string) => {
    if (teamId === match.homeTeamId && match.homeShootOutScore != null) return match.homeShootOutScore;
    if (teamId === match.awayTeamId && match.awayShootOutScore != null) return match.awayShootOutScore;
    return attempts.filter((a) => a.teamId === teamId && a.scored).length;
  };
  const nameOf = (id: string | null) => (id ? players[id]?.name ?? "Unknown player" : null);
  const shirtOf = (id: string | null) => (id ? players[id]?.shirtNumber ?? null : null);

  return (
    <section className="mt-6">
      <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-yellow-200">Shootout</h2>

      <div className="mt-4 flex items-center justify-center gap-6 rounded-2xl border border-white/10 bg-black/20 p-5 text-white">
        {teams.map((t, i) => (
          <div key={t} className="flex items-center gap-6">
            {i === 1 ? <span className="text-2xl font-black text-white/40">–</span> : null}
            <div className="text-center">
              <p className="text-xs font-bold text-white/70">{teamNameById[t] ?? t}</p>
              <p className="text-4xl font-black tabular-nums">{score(t)}</p>
            </div>
          </div>
        ))}
      </div>

      {attempts.length === 0 ? (
        <p className="mt-4 text-sm text-white/60">
          The shootout score is recorded, but the individual attempts (who shot, the keeper and the outcome) have not been entered for this match yet.
        </p>
      ) : (
        <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
          {teams.map((t) => (
            <div key={t}>
              <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-white">
                <span className="inline-block h-3 w-3 rounded-full" style={{ background: teamColorById[t]?.primary ?? "#94a3b8" }} aria-hidden />
                {teamNameById[t] ?? t}
              </h3>
              <ol className="space-y-2">
                {attempts.filter((a) => a.teamId === t).map((a) => (
                  <li key={`${t}-${a.round}`} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 p-3 text-white">
                    <span className="w-6 text-center text-xs font-black text-white/50">{a.round}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold">
                        {shirtOf(a.shooterId) != null ? <span className="mr-1.5 text-white/60">#{shirtOf(a.shooterId)}</span> : null}
                        {nameOf(a.shooterId)}
                      </p>
                      <p className="truncate text-xs text-white/60">
                        {a.goalkeeperId ? `vs GK ${nameOf(a.goalkeeperId)}` : "Keeper not recorded"}
                      </p>
                    </div>
                    <Mark scored={a.scored} />
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
