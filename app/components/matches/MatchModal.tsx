"use client";

import React, { useMemo } from "react";
import Image from "next/image";

interface Goal {
  team: string;
  playerNum: string;
  playerName: string;
  time: number;
  type: string;
}

interface Card {
  team: string;
  playerNum: string;
  playerName: string;
  time: number;
  type: string;
}

interface ShootoutAttempt {
  playerNum: string;
  playerName: string;
  type: string;
  result: "Goal" | "Miss";
}

interface MatchStats {
  goals?: Goal[];
  cards?: Card[];
  shootout?: {
    home: ShootoutAttempt[];
    away: ShootoutAttempt[];
  } | null;
}

interface Match {
  homeTeam: string;
  homeTeamIcon: string;
  awayTeam: string;
  awayTeamIcon: string;
  homeScore: number;
  awayScore: number;
  status: string;
  homeShootOutScore?: number;
  awayShootOutScore?: number;
}

interface TimelineEvent {
  team: string;
  playerNum: string;
  playerName: string;
  time: number;
  type: "GOAL" | "CARD";
  cardType?: string;
  goalType?: string;
}

interface UmpireDetails {
  umpireName: string;
  umpireNumber: string;
  club: string;
  umpireLevel: string;
  isActive: boolean;
}

export default function MatchModal({
  match,
  matchStats,
  onClose,
  isUpcoming = false,
  umpires = null,
}: {
  match: Match;
  matchStats: MatchStats | null;
  onClose: () => void;
  isUpcoming?: boolean;
  umpires?: UmpireDetails[] | null;
}) {
  if (!match) return null;

  // Combine goals and cards into one timeline, using 'time' instead of 'minute'
  const timelineEvents = useMemo(() => {
    if (!matchStats) return [];

    const goals: TimelineEvent[] = (matchStats.goals || []).map((g) => ({
      team: g.team,
      playerNum: g.playerNum,
      playerName: g.playerName,
      time: g.time,
      type: "GOAL" as const,
      goalType: g.type,
    }));

    const cards: TimelineEvent[] = (matchStats.cards || []).map((c) => ({
      team: c.team,
      playerNum: c.playerNum,
      playerName: c.playerName,
      time: c.time,
      type: "CARD" as const,
      cardType: c.type,
    }));

    return [...goals, ...cards].sort((a, b) => a.time - b.time);
  }, [matchStats]);

  const getCardColor = (cardType: string) => {
    switch (cardType?.toLowerCase()) {
      case "green":
        return "bg-green-50 border-green-300 text-green-800";
      case "yellow":
        return "bg-yellow-50 border-yellow-300 text-yellow-800";
      case "red":
        return "bg-red-50 border-red-300 text-red-800";
      default:
        return "bg-gray-50 border-gray-300 text-gray-800";
    }
  };

  const getCardEmoji = (cardType: string) => {
    switch (cardType?.toLowerCase()) {
      case "green":
        return "🟩";
      case "yellow":
        return "🟨";
      case "red":
        return "🟥";
      default:
        return "⬜";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-sm">
      <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl border-4 border-[#06054e] max-h-[90vh] overflow-hidden flex flex-col">
        {/* HEADER */}
        <div className="bg-[#06054e] p-6 text-white shrink-0">
          <div className="flex justify-between items-start mb-2">
            <h2 className="text-xl font-black uppercase italic tracking-tighter">
              {isUpcoming ? "Fixture Details" : "Match Overview"}
            </h2>
            <button
              onClick={onClose}
              className="bg-red-600 text-white w-8 h-8 rounded-full font-black hover:bg-red-700 transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Location and Umpires in header */}
          <div className="space-y-2 mt-4 pt-4 border-t border-white/20">
            {isUpcoming && match.location && (
              <div className="flex items-center gap-2 text-[11px]">
                <span className="opacity-70">📍</span>
                <span className="font-bold">{match.location}</span>
              </div>
            )}

            {umpires && umpires.length > 0 && (
              <div className="flex items-start gap-2 text-[11px]">
                <span className="opacity-70">👥</span>
                <div>
                  <span className="font-black uppercase opacity-70 text-[9px]">
                    Umpires:{" "}
                  </span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {umpires.map((umpire, idx) => (
                      <span
                        key={idx}
                        className="bg-white/10 px-2 py-1 rounded-full font-bold text-[10px]"
                      >
                        {umpire.umpireName} ({umpire.umpireLevel})
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {isUpcoming && (
              <div className="flex items-center gap-2 text-[11px]">
                <span className="opacity-70">🕐</span>
                <span className="font-bold">
                  {new Date(match.dateTime).toLocaleString("en-AU", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="p-8 overflow-y-auto">
          {/* SCOREBOARD */}
          <div className="flex justify-between items-center mb-10 pb-8 border-b-2">
            <div className="text-center w-1/3">
              <Image
                src={match.homeTeamIcon}
                alt={match.homeTeam}
                width={50}
                height={50}
                className="mx-auto mb-2"
              />
              <p className="text-[10px] font-black uppercase">
                {match.homeTeam}
              </p>
            </div>
            <div className="text-center">
              <div className="text-5xl font-black italic text-[#06054e]">
                {match.homeScore} - {match.awayScore}
              </div>
              {match.status === "Final (SO)" &&
                match.homeShootOutScore !== undefined && (
                  <div className="text-red-600 font-black text-xs mt-1">
                    ({match.homeShootOutScore} - {match.awayShootOutScore} SO)
                  </div>
                )}
            </div>
            <div className="text-center w-1/3">
              <Image
                src={match.awayTeamIcon}
                alt={match.awayTeam}
                width={50}
                height={50}
                className="mx-auto mb-2"
              />
              <p className="text-[10px] font-black uppercase">
                {match.awayTeam}
              </p>
            </div>
          </div>

          {/* TIMELINE */}
          {!isUpcoming && (
            <div className="space-y-4 mb-8">
              <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest border-l-4 border-red-600 pl-2">
                Match Timeline
              </h3>
              {timelineEvents.length > 0 ? (
                timelineEvents.map((event, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-4 ${
                      event.team === match.homeTeam
                        ? "flex-row"
                        : "flex-row-reverse"
                    }`}
                  >
                    <div
                      className={`flex-1 p-3 rounded-xl border text-[11px] font-bold ${
                        event.type === "GOAL"
                          ? "bg-blue-50 border-blue-300 text-blue-800"
                          : getCardColor(event.cardType || "")
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>
                          #{event.playerNum} {event.playerName}
                        </span>
                        <span className="text-[9px] font-black uppercase opacity-60">
                          {event.type === "GOAL"
                            ? event.goalType
                            : `${event.cardType} Card`}
                        </span>
                      </div>
                      <div className="mt-1">
                        {event.type === "GOAL"
                          ? "⚽"
                          : getCardEmoji(event.cardType || "")}
                      </div>
                    </div>
                    <div className="w-10 h-10 rounded-full border-2 border-[#06054e] flex items-center justify-center text-[10px] font-black shrink-0 bg-white">
                      {event.time}'
                    </div>
                    <div className="flex-1"></div>
                  </div>
                ))
              ) : (
                <p className="text-center text-slate-400 text-xs py-8 italic">
                  No match events recorded
                </p>
              )}
            </div>
          )}

          {/* SHOOTOUT SECTION - Moved to bottom */}
          {matchStats?.shootout && (
            <div className="mt-8 p-6 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border-2 border-slate-700">
              <h3 className="text-[10px] font-black uppercase text-slate-300 tracking-widest mb-4 text-center">
                🎯 Shootout Details
              </h3>

              <div className="grid grid-cols-2 gap-6">
                {/* Home Team Shootout */}
                <div>
                  <p className="text-[9px] font-black uppercase text-slate-400 mb-2 text-center">
                    {match.homeTeam}
                  </p>
                  <div className="space-y-2">
                    {matchStats.shootout.home.map((attempt, i) => (
                      <div
                        key={i}
                        className={`flex items-center gap-2 p-2 rounded-lg text-[10px] ${
                          attempt.result === "Goal"
                            ? "bg-green-500/20 text-green-300"
                            : "bg-red-500/20 text-red-300"
                        }`}
                      >
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-white shrink-0 ${
                            attempt.result === "Goal"
                              ? "bg-green-500"
                              : "bg-red-500"
                          }`}
                        >
                          {attempt.result === "Goal" ? "✓" : "✕"}
                        </div>
                        <div className="flex-1">
                          <div className="font-black">
                            #{attempt.playerNum} {attempt.playerName}
                          </div>
                          <div className="text-[8px] opacity-70">
                            {attempt.type}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Away Team Shootout */}
                <div>
                  <p className="text-[9px] font-black uppercase text-slate-400 mb-2 text-center">
                    {match.awayTeam}
                  </p>
                  <div className="space-y-2">
                    {matchStats.shootout.away.map((attempt, i) => (
                      <div
                        key={i}
                        className={`flex items-center gap-2 p-2 rounded-lg text-[10px] ${
                          attempt.result === "Goal"
                            ? "bg-green-500/20 text-green-300"
                            : "bg-red-500/20 text-red-300"
                        }`}
                      >
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-white shrink-0 ${
                            attempt.result === "Goal"
                              ? "bg-green-500"
                              : "bg-red-500"
                          }`}
                        >
                          {attempt.result === "Goal" ? "✓" : "✕"}
                        </div>
                        <div className="flex-1">
                          <div className="font-black">
                            #{attempt.playerNum} {attempt.playerName}
                          </div>
                          <div className="text-[8px] opacity-70">
                            {attempt.type}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
