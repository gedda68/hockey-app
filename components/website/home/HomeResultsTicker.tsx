"use client";

import { Fragment } from "react";
import type { TickerLine, TickerTeam } from "@/lib/competitions/tickerLines";

export type { TickerLine };

function TeamIcon({ team }: { team: TickerTeam }) {
  if (team.icon) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={team.icon} alt={team.name} title={team.name} className="h-6 w-6 shrink-0 rounded-full bg-slate-100 object-contain" />;
  }
  return (
    <span title={team.name} className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#06054e] text-[9px] font-black text-yellow-200">
      {team.name.trim().slice(0, 2).toUpperCase() || "?"}
    </span>
  );
}

export default function HomeResultsTicker({ lines }: { lines: TickerLine[] }) {
  return (
    <div
      className="relative mx-auto w-3/4 overflow-hidden rounded-2xl border border-white/90 bg-white/95 text-slate-800 shadow-[0_8px_30px_-8px_rgba(0,0,0,0.35)] ring-1 ring-black/10 backdrop-blur-md"
      style={{
        // Prevent scroll anchoring from "helpfully" adjusting scroll position when the ticker updates.
        // This is a common source of small scroll jumps on refresh.
        overflowAnchor: "none",
      }}
    >
      <div className="absolute left-0 top-0 bottom-0 w-10 z-10 bg-gradient-to-r from-white to-transparent pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-10 z-10 bg-gradient-to-l from-white to-transparent pointer-events-none" />

      {/* Fixed height prevents scroll jump if lines temporarily change */}
      <div className="h-10 flex items-center">
        {lines.length === 0 ? (
          <div className="px-4 text-xs font-black uppercase tracking-widest text-slate-400" aria-hidden>
            {/* keep height stable even while loading */}
          </div>
        ) : (
          <div
            className="home-marquee-track gap-5 items-center"
            suppressHydrationWarning
          >
            {[0, 1].map((dup) =>
              lines.map((line, i) => (
                <Fragment key={`${dup}-${line.key}-${i}`}>
                <span
                  className="inline-flex items-center gap-2 text-xs md:text-sm font-bold tracking-wide text-slate-800 whitespace-nowrap"
                  aria-label={`${line.division} ${line.round}: ${line.home.name} ${line.homeScore}, ${line.away.name} ${line.awayScore}`}
                >
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#06054e]">{line.division}</span>
                  {line.round && <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{line.round}</span>}
                  <TeamIcon team={line.home} />
                  <span className="tabular-nums">{line.homeScore}</span>
                  <span aria-hidden>:</span>
                  <span className="tabular-nums">{line.awayScore}</span>
                  <TeamIcon team={line.away} />
                </span>
                <span aria-hidden className="select-none text-slate-300">|</span>
                </Fragment>
              )),
            )}
          </div>
        )}
      </div>
    </div>
  );
}
