"use client";

import { useState, useEffect } from "react"; // Added useEffect
import Image from "next/image";
import MatchModal from "./MatchModal";

export default function MatchList({
  matches,
  stats,
}: {
  matches: any[];
  stats: any;
}) {
  const [selectedMatch, setSelectedMatch] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  // This ensures the date rendering only happens on the client
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!matches || matches.length === 0) {
    return (
      <div className="bg-white p-20 rounded-3xl border-2 border-dashed border-slate-200 text-center uppercase text-xs font-black text-slate-400 tracking-widest">
        No matches found for this selection
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {matches.map((match) => {
          const isLive =
            match.status?.toLowerCase().includes("live") ||
            match.status?.toLowerCase().includes("progress");
          const matchDate = new Date(match.dateTime);

          return (
            <div
              key={match.matchId}
              onClick={() => setSelectedMatch(match)}
              className={`group cursor-pointer bg-white rounded-2xl shadow-md overflow-hidden border transition-all hover:shadow-xl hover:-translate-y-1 ${
                isLive
                  ? "border-red-500 ring-1 ring-red-500/10"
                  : "border-slate-200"
              }`}
            >
              <div
                className={`px-4 py-2 flex justify-between items-center border-b ${
                  isLive ? "bg-red-50" : "bg-slate-50"
                }`}
              >
                <span className="text-[9px] font-black uppercase text-slate-500">
                  {match.division} • {match.round}
                </span>
                <span
                  className={`text-[9px] font-black uppercase italic flex items-center gap-1.5 ${
                    isLive ? "text-red-600" : "text-slate-400"
                  }`}
                >
                  {isLive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse"></span>
                  )}
                  {match.shootOutRequired ? "Final (SO)" : match.status}
                </span>
              </div>

              <div className="p-6 flex items-center justify-between gap-2 relative text-center">
                <div className="w-[45%] flex flex-col items-center">
                  {match.homeTeamIcon && (
                    <div className="relative w-8 h-8 mb-2">
                      <Image
                        src={match.homeTeamIcon}
                        alt=""
                        fill
                        className="object-contain"
                      />
                    </div>
                  )}
                  <span className="text-[9px] font-black text-[#06054e] uppercase h-6 leading-tight">
                    {match.homeTeam}
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-4xl font-black text-slate-900">
                      {match.homeScore}
                    </span>
                    {match.shootOutRequired && (
                      <span className="text-lg font-black text-red-600">
                        ({match.homeShootOutScore})
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-[10px] font-black text-slate-200">VS</div>
                <div className="w-[45%] flex flex-col items-center">
                  {match.awayTeamIcon && (
                    <div className="relative w-8 h-8 mb-2">
                      <Image
                        src={match.awayTeamIcon}
                        alt=""
                        fill
                        className="object-contain"
                      />
                    </div>
                  )}
                  <span className="text-[9px] font-black text-[#06054e] uppercase h-6 leading-tight">
                    {match.awayTeam}
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-4xl font-black text-slate-900">
                      {match.awayScore}
                    </span>
                    {match.shootOutRequired && (
                      <span className="text-lg font-black text-red-600">
                        ({match.awayShootOutScore})
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="px-4 py-2 bg-slate-900 flex justify-between items-center text-[8px] font-bold text-slate-400 uppercase">
                <span>📍 {match.location}</span>
                {/* HYDRATION FIX: Only show the date once the component is mounted */}
                <span>
                  {mounted ? (
                    <>
                      {matchDate.toLocaleDateString("en-AU", {
                        day: "2-digit",
                        month: "short",
                      })}{" "}
                      •{" "}
                      {matchDate.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </>
                  ) : (
                    "Loading Time..."
                  )}
                </span>
              </div>

              <div className="bg-slate-100 py-1.5 text-center text-[7px] font-black text-slate-400 uppercase tracking-[0.2em] group-hover:bg-red-50 group-hover:text-red-600 transition-colors uppercase">
                Click for match stats
              </div>
            </div>
          );
        })}
      </div>

      {selectedMatch && (
        <MatchModal
          match={selectedMatch}
          stats={stats ? stats[selectedMatch.matchId] : null}
          onClose={() => setSelectedMatch(null)}
        />
      )}
    </>
  );
}
