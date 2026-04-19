"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { PublicMatchCentre } from "@/lib/data/matches";
import MatchCentreTabs from "@/components/matches/MatchCentreTabs";

function pollIntervalMs(status: string): number | null {
  if (status === "Final" || status === "Final (SO)") return null;
  if (status === "Live") return 15_000;
  return 45_000;
}

export default function PublicMatchCentreClient({
  initialCentre,
  fixtureId,
}: {
  initialCentre: PublicMatchCentre;
  fixtureId: string;
}) {
  const [centre, setCentre] = useState<PublicMatchCentre>(initialCentre);

  const fetchSnapshot = useCallback(async () => {
    const qs = typeof window !== "undefined" ? window.location.search : "";
    const res = await fetch(`/api/public/match-centre/${encodeURIComponent(fixtureId)}${qs}`, {
      credentials: "same-origin",
      cache: "no-store",
    });
    if (!res.ok) return;
    const next = (await res.json()) as PublicMatchCentre;
    setCentre(next);
  }, [fixtureId]);

  const intervalMs = useMemo(
    () => pollIntervalMs(centre.match.status),
    [centre.match.status],
  );

  useEffect(() => {
    if (intervalMs == null) return undefined;
    const id = window.setInterval(() => {
      void fetchSnapshot();
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [fetchSnapshot, intervalMs]);

  const match = centre.match;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#06054e] via-slate-900 to-slate-800 px-4 py-10 md:px-8">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/competitions/matches"
          className="inline-flex text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white"
        >
          ← Back to fixtures & results
        </Link>

        <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-6 text-white">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-black uppercase italic tracking-tight">
                Match centre
              </h1>
              <p className="mt-1 text-sm text-white/70">
                Round {match.round} · {match.division}
              </p>
              <p className="mt-1 text-sm text-white/70">
                {new Date(match.dateTime).toLocaleString("en-AU", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                {match.location ? ` · ${match.location}` : ""}
              </p>
            </div>

            <div className="mt-3 flex flex-col items-start gap-2 sm:mt-0 sm:items-end">
              <span className="inline-flex rounded-full border border-white/15 bg-black/20 px-3 py-1 text-[11px] font-black">
                {match.status}
              </span>
              {intervalMs != null ? (
                <span className="text-[10px] font-black uppercase tracking-widest text-white/40">
                  Auto-refresh on
                </span>
              ) : null}
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3 sm:items-center">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-[11px] font-black uppercase text-white/60">Home</p>
              <p className="mt-1 text-lg font-black">{match.homeTeam}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-center">
              <p className="text-4xl font-black italic tracking-tight">
                {match.homeScore ?? "-"}:{match.awayScore ?? "-"}
              </p>
              {match.status === "Final (SO)" &&
              match.homeShootOutScore != null &&
              match.awayShootOutScore != null ? (
                <p className="mt-2 text-[11px] font-black text-yellow-200">
                  Shootout {match.homeShootOutScore}-{match.awayShootOutScore}
                </p>
              ) : null}
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-right">
              <p className="text-[11px] font-black uppercase text-white/60">Away</p>
              <p className="mt-1 text-lg font-black">{match.awayTeam}</p>
            </div>
          </div>

          <MatchCentreTabs
            match={match}
            teamNameById={centre.teamNameById}
            venue={centre.venue}
            umpires={centre.umpires}
          />
        </div>
      </div>
    </div>
  );
}
