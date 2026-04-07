"use client";

import Image from "next/image";
import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils";
import Card from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import Text from "@/components/ui/Text";
import type { Match, UmpireDetails } from "../../types";

const matchMetaVariants = cva(
  "flex flex-col items-center md:items-start min-w-[120px]",
);

const scoreVariants = cva(
  "text-3xl md:text-5xl font-black italic tracking-tighter flex items-center gap-2",
  {
    variants: {
      result: {
        win: "text-green-600",
        loss: "text-red-600",
        draw: "text-slate-600",
        pending: "text-[#06054e]",
      },
    },
    defaultVariants: {
      result: "pending",
    },
  },
);

interface MatchCardProps {
  match: Match;
  isUpcoming: boolean;
  umpires?: UmpireDetails[] | null;
  onClick: () => void;
}

export default function MatchCard({
  match,
  isUpcoming,
  umpires,
  onClick,
}: MatchCardProps) {
  return (
    <Card variant="default" interactive className="p-6 group" onClick={onClick}>
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        {/* MATCH META (Left) */}
        <div className={matchMetaVariants()}>
          <Badge variant="default" size="sm">
            {match.round}
          </Badge>
          <Text variant="tiny" className="mt-1 uppercase">
            {new Date(match.dateTime).toLocaleDateString("en-AU", {
              day: "2-digit",
              month: "short",
            })}
          </Text>

          {/* Location for fixtures */}
          {isUpcoming && match.location && (
            <Text variant="tiny" className="mt-1 text-center md:text-left">
              📍 {match.location}
            </Text>
          )}
        </div>

        {/* TEAMS & SCORE (Center) */}
        <div className="flex-1 flex items-center justify-center gap-4 md:gap-12 w-full">
          {/* Home Team */}
          <div className="flex flex-1 items-center justify-end gap-4">
            <Text
              variant="h4"
              className="text-sm md:text-lg text-right leading-tight"
            >
              {match.homeTeam}
            </Text>
            {match.homeTeamIcon ? (
              <div className="relative w-12 h-12 shrink-0">
                <Image
                  src={match.homeTeamIcon}
                  alt={match.homeTeam}
                  fill
                  sizes="48px"
                  className="object-contain"
                />
              </div>
            ) : (
              <div
                className="w-12 h-12 shrink-0 rounded-lg bg-slate-100 border border-slate-200"
                aria-hidden
              />
            )}
          </div>

          {/* Score Area */}
          <div className="flex flex-col items-center justify-center min-w-[100px]">
            <div className={scoreVariants()}>
              <span>{match.homeScore ?? "-"}</span>
              <span className="text-slate-200 text-2xl md:text-3xl">:</span>
              <span>{match.awayScore ?? "-"}</span>
            </div>

            {/* SHOOTOUT BADGE */}
            {match.status === "Final (SO)" && (
              <Badge variant="info" size="md" className="mt-2 bg-blue-600 text-white border-0">
                <div className="flex flex-col items-center">
                  <span className="text-[7px] opacity-80 leading-none">
                    Shootout Result
                  </span>
                  <span className="text-[11px] leading-tight">
                    {match.homeShootOutScore} - {match.awayShootOutScore}
                  </span>
                </div>
              </Badge>
            )}

            {match.status === "Scheduled" && (
              <Badge variant="default" size="md" className="mt-2">
                {new Date(match.dateTime).toLocaleTimeString("en-AU", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                })}
              </Badge>
            )}
          </div>

          {/* Away Team */}
          <div className="flex flex-1 items-center justify-start gap-4">
            {match.awayTeamIcon ? (
              <div className="relative w-12 h-12 shrink-0">
                <Image
                  src={match.awayTeamIcon}
                  alt={match.awayTeam}
                  fill
                  sizes="48px"
                  className="object-contain"
                />
              </div>
            ) : (
              <div
                className="w-12 h-12 shrink-0 rounded-lg bg-slate-100 border border-slate-200"
                aria-hidden
              />
            )}
            <Text variant="h4" className="text-sm md:text-lg leading-tight">
              {match.awayTeam}
            </Text>
          </div>
        </div>

        {/* STATUS / ACTION (Right) */}
        <div className="hidden md:flex flex-col items-end min-w-[100px]">
          <Badge
            variant="default"
            size="md"
            className="border border-slate-200 bg-transparent group-hover:border-[#06054e] transition-colors"
          >
            Details →
          </Badge>
        </div>
      </div>

      {/* Umpires section for fixtures */}
      {isUpcoming && umpires && umpires.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2">
          <Text variant="label" className="text-slate-400">
            Umpires:
          </Text>
          <div className="flex gap-2 flex-wrap">
            {umpires.map((umpire, idx) => (
              <Badge
                key={idx}
                variant="default"
                size="sm"
                className="bg-transparent text-slate-600 font-bold"
              >
                {umpire?.umpireName} ({umpire?.umpireLevel})
              </Badge>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

export { scoreVariants };
