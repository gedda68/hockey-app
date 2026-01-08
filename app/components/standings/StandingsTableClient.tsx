"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils";
import StandingsRow from "./StandingsRow";
import Button from "../ui/Button";
import Text from "../ui/Text";
import type { Division, Season } from "../../types";

const standingsContainerVariants = cva(
  "sticky top-8 bg-[#06054e] rounded-3xl p-6 shadow-2xl text-white"
);

const tableHeaderVariants = cva(
  "grid grid-cols-12 items-center px-2 pb-2 border-b border-white/20 text-[8px] font-black uppercase text-slate-400"
);

const emptyStateVariants = cva("text-center py-8");

interface StandingsTableClientProps {
  division: Division | null;
  selectedDiv: string;
  seasons: Season[];
  currentYear: string;
}

export default function StandingsTableClient({
  division,
  selectedDiv,
  seasons,
  currentYear,
}: StandingsTableClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleYearChange = (year: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("standingsYear", year);
    router.push(`/competitions/matches?${params.toString()}`);
  };

  return (
    <div className={standingsContainerVariants()}>
      {/* Header with Year Filter */}
      <div className="flex justify-between items-center mb-4">
        <Text as="h2" className="text-lg font-black uppercase italic">
          Standings
        </Text>
      </div>

      {/* Year Filter */}
      {seasons.length > 0 && (
        <div className="mb-4 pb-4 border-b border-white/20">
          <Text variant="label" className="text-white/60 mb-2 block">
            Season
          </Text>
          <div className="flex gap-2 flex-wrap">
            {seasons.map((season) => (
              <Button
                key={season.year}
                variant="outline"
                size="sm"
                onClick={() => handleYearChange(season.year.toString())}
                className={cn(
                  "text-[9px] transition-all",
                  currentYear === season.year.toString()
                    ? "bg-white text-[#06054e] border-white hover:bg-white/90"
                    : "bg-transparent text-white border-white/30 hover:bg-white/10 hover:border-white/50"
                )}
              >
                {season.year}
              </Button>
            ))}
          </div>
        </div>
      )}

      {division && division.teams && division.teams.length > 0 ? (
        <div className="space-y-1">
          {/* Table Header */}
          <div className={tableHeaderVariants()}>
            <div className="col-span-1">#</div>
            <div className="col-span-5">Team</div>
            <div className="col-span-2 text-center">P</div>
            <div className="col-span-2 text-center">GD</div>
            <div className="col-span-2 text-right">Pts</div>
          </div>

          {/* Team Rows */}
          {division.teams.map((team) => (
            <StandingsRow
              key={team.club}
              team={team}
              totalTeams={division.teams.length}
            />
          ))}

          {/* Stats Summary */}
          <div className="mt-4 pt-4 border-t border-white/20">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <Text variant="label" className="text-white/60 block mb-1">
                  Teams
                </Text>
                <Text className="text-xl font-black text-white">
                  {division.teams.length}
                </Text>
              </div>
              <div>
                <Text variant="label" className="text-white/60 block mb-1">
                  Matches
                </Text>
                <Text className="text-xl font-black text-white">
                  {division.teams.reduce((sum, t) => sum + (t.played || 0), 0)}
                </Text>
              </div>
              <div>
                <Text variant="label" className="text-white/60 block mb-1">
                  Goals
                </Text>
                <Text className="text-xl font-black text-white">
                  {division.teams.reduce(
                    (sum, t) => sum + (t.goalsFor || 0),
                    0
                  )}
                </Text>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className={emptyStateVariants()}>
          <Text variant="label" className="text-slate-400">
            {selectedDiv === "All"
              ? "Select a division to view standings"
              : "No standings available"}
          </Text>
        </div>
      )}
    </div>
  );
}
