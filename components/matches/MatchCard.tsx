"use client";

import Image from "next/image";
import Link from "next/link";
import { cva } from "class-variance-authority";
import Card from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import Text from "@/components/ui/Text";
import type { Match, UmpireDetails } from "../../types";

const matchMetaVariants = cva(
  "flex flex-col items-center md:items-start min-w-[120px]",
);

const scoreVariants = cva(
  "text-2xl md:text-4xl font-black italic tracking-tighter flex items-center gap-2",
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

/** Same size + colour for every card action (navy = former ladder header colour). */
const actionButtonClass =
  "inline-flex h-10 flex-1 items-center justify-center whitespace-nowrap rounded-xl bg-[#06054e] px-4 text-xs font-bold uppercase tracking-wider text-white shadow-sm transition hover:bg-[#1a1870] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-300 md:w-full md:flex-none";

interface MatchCardProps {
  match: Match;
  isUpcoming: boolean;
  umpires?: UmpireDetails[] | null;
  href: string;
  onQuickView?: () => void;
  /** When true, hide scores until user chooses to reveal (B1 spoiler-free). */
  spoilerFree?: boolean;
}

export default function MatchCard({
  match,
  isUpcoming,
  umpires,
  href,
  onQuickView,
  spoilerFree = false,
}: MatchCardProps) {
  const shouldHideScore =
    spoilerFree &&
    (match.status === "Final" ||
      match.status === "Final (SO)" ||
      match.status === "Live");

  return (
    <Card variant="default" className="p-0 group">
      <div className="p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <Link
            href={href}
            className="min-w-0 flex-1 rounded-2xl outline-none focus:ring-4 ring-yellow-400/20"
            aria-label={`Open match centre: ${match.homeTeam} vs ${match.awayTeam}`}
          >
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
        <div className="flex min-w-0 flex-1 items-center justify-center gap-3 md:gap-6 w-full">
          {/* Home Team */}
          <div className="flex min-w-0 flex-1 items-center justify-end gap-3">
            <Text
              variant="h4"
              className="text-sm md:text-base text-right leading-tight"
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
          <div className="flex flex-col items-center justify-center min-w-[84px]">
            <div className={scoreVariants()}>
              <span>{shouldHideScore ? "—" : (match.homeScore ?? "-")}</span>
              <span className="text-slate-200 text-xl md:text-2xl">:</span>
              <span>{shouldHideScore ? "—" : (match.awayScore ?? "-")}</span>
            </div>

            {/* SHOOTOUT BADGE */}
            {match.status === "Final (SO)" && !shouldHideScore && (
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
          <div className="flex min-w-0 flex-1 items-center justify-start gap-3">
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
            <Text variant="h4" className="text-sm md:text-base leading-tight">
              {match.awayTeam}
            </Text>
          </div>
        </div>

      </div>
          </Link>

          {/* Actions: inside the card, equal size */}
          <div className="flex shrink-0 gap-2 md:w-40 md:flex-col">
            <Link href={href} className={actionButtonClass}>
              Match centre →
            </Link>
            {onQuickView ? (
              <button type="button" onClick={onQuickView} className={actionButtonClass}>
                Quick view
              </button>
            ) : null}
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
      </div>
    </Card>
  );
}

export { scoreVariants };
