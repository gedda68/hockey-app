"use client";

import { cva } from "class-variance-authority";
import StandingsRow from "./StandingsRow";
import Text from "../ui/Text";
import type { Division } from "../../types";

const standingsContainerVariants = cva(
  "bg-[#06054e] rounded-3xl p-8 shadow-2xl text-white"
);

const tableHeaderVariants = cva(
  "grid grid-cols-12 items-center px-2 pb-2 border-b border-white/20 text-[8px] font-black uppercase text-slate-400"
);

const emptyStateVariants = cva("text-center py-12");

interface StandingsTableFullProps {
  division: Division | null;
  currentYear: string;
}

export default function StandingsTableFull({
  division,
  currentYear,
}: StandingsTableFullProps) {
  return (
    <div className={standingsContainerVariants()}>
      {/* Large Header with Current Filters */}
      <div className="mb-6 pb-6 border-b-2 border-white/20">
        <Text
          as="h1"
          className="text-3xl font-black uppercase italic text-white/90 mb-2"
        >
          {division?.divisionName || "Standings"}
        </Text>
        <Text className="text-sm font-bold text-white/60 uppercase tracking-wide">
          {currentYear} Season
        </Text>
      </div>

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
          <div className="mt-6 pt-6 border-t-2 border-white/20">
            <Text
              variant="label"
              className="text-white/60 mb-4 block text-center"
            >
              Season Statistics
            </Text>
            <div className="grid grid-cols-3 gap-6 text-center">
              <div>
                <Text variant="label" className="text-white/60 block mb-2">
                  Teams
                </Text>
                <Text className="text-3xl font-black text-white">
                  {division.teams.length}
                </Text>
              </div>
              <div>
                <Text variant="label" className="text-white/60 block mb-2">
                  Total Played
                </Text>
                <Text className="text-3xl font-black text-white">
                  {division.teams.reduce(
                    (sum, t) => sum + (t.p || t.played || 0),
                    0
                  )}
                </Text>
              </div>
              <div>
                <Text variant="label" className="text-white/60 block mb-2">
                  Avg Goal Diff
                </Text>
                <Text className="text-3xl font-black text-white">
                  {Math.round(
                    (division.teams.reduce(
                      (sum, t) => sum + (t.gd || t.goalDifference || 0),
                      0
                    ) /
                      division.teams.length) *
                      10
                  ) / 10}
                </Text>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className={emptyStateVariants()}>
          <Text variant="label" className="text-slate-400 text-lg">
            No standings available
          </Text>
        </div>
      )}
    </div>
  );
}
