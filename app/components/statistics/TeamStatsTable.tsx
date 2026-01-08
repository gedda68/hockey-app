"use client";

import Image from "next/image";
import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils";

const tableContainerVariants = cva("bg-white rounded-3xl p-8 shadow-lg");

const tableHeaderVariants = cva(
  "grid grid-cols-12 items-center px-4 pb-3 border-b-2 border-slate-200 text-[8px] font-black uppercase text-slate-400 tracking-wider"
);

const rowVariants = cva(
  "grid grid-cols-12 items-center px-4 py-4 hover:bg-slate-50 transition-colors rounded-xl cursor-pointer border-b border-slate-100 last:border-0"
);

interface TeamStats {
  rank: number;
  club: string;
  clubIcon: string;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  cleanSheets: number;
  avgGoalsPerMatch: number;
}

interface TeamStatsTableProps {
  division: string;
  year: string;
}

export default function TeamStatsTable({
  division,
  year,
}: TeamStatsTableProps) {
  // Mock data - replace with actual data fetching
  const teams: TeamStats[] = [
    {
      rank: 1,
      club: "Commercial",
      clubIcon: "/icons/commercial.svg",
      goalsFor: 68,
      goalsAgainst: 24,
      goalDifference: 44,
      cleanSheets: 8,
      avgGoalsPerMatch: 4.53,
    },
    {
      rank: 2,
      club: "Easts",
      clubIcon: "/icons/easts.svg",
      goalsFor: 62,
      goalsAgainst: 28,
      goalDifference: 34,
      cleanSheets: 7,
      avgGoalsPerMatch: 3.88,
    },
    {
      rank: 3,
      club: "Souths United",
      clubIcon: "/icons/souths.svg",
      goalsFor: 58,
      goalsAgainst: 32,
      goalDifference: 26,
      cleanSheets: 6,
      avgGoalsPerMatch: 4.14,
    },
    {
      rank: 4,
      club: "Valleys",
      clubIcon: "/icons/valleys.svg",
      goalsFor: 52,
      goalsAgainst: 38,
      goalDifference: 14,
      cleanSheets: 4,
      avgGoalsPerMatch: 3.25,
    },
    {
      rank: 5,
      club: "Kedron Wavell",
      clubIcon: "/icons/kedron.svg",
      goalsFor: 48,
      goalsAgainst: 42,
      goalDifference: 6,
      cleanSheets: 3,
      avgGoalsPerMatch: 3.2,
    },
  ];

  return (
    <div className={tableContainerVariants()}>
      {/* Header */}
      <div className="mb-6 pb-4 border-b-2 border-[#06054e]">
        <h3 className="text-xl font-black uppercase italic text-[#06054e] mb-1">
          Team Statistics
        </h3>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
          {division} · {year} Season
        </p>
      </div>

      {/* Table Header */}
      <div className={tableHeaderVariants()}>
        <div className="col-span-1">#</div>
        <div className="col-span-3">Team</div>
        <div className="col-span-2 text-center">GF</div>
        <div className="col-span-2 text-center">GA</div>
        <div className="col-span-2 text-center">GD</div>
        <div className="col-span-2 text-center">CS</div>
      </div>

      {/* Team Rows */}
      <div className="mt-2">
        {teams.map((team) => (
          <div key={team.rank} className={rowVariants()}>
            {/* Rank */}
            <div className="col-span-1 font-black text-sm text-slate-600">
              {team.rank}
            </div>

            {/* Team Info */}
            <div className="col-span-3 flex items-center gap-3">
              <div className="relative w-6 h-6 shrink-0">
                <Image
                  src={team.clubIcon}
                  alt={team.club}
                  fill
                  className="object-contain"
                />
              </div>
              <span className="text-xs font-black text-slate-900 uppercase">
                {team.club}
              </span>
            </div>

            {/* Goals For */}
            <div className="col-span-2 text-center">
              <span className="text-sm font-black text-green-600">
                {team.goalsFor}
              </span>
            </div>

            {/* Goals Against */}
            <div className="col-span-2 text-center">
              <span className="text-sm font-black text-red-600">
                {team.goalsAgainst}
              </span>
            </div>

            {/* Goal Difference */}
            <div className="col-span-2 text-center">
              <span
                className={cn(
                  "text-sm font-black",
                  team.goalDifference > 0
                    ? "text-green-600"
                    : team.goalDifference < 0
                    ? "text-red-600"
                    : "text-slate-400"
                )}
              >
                {team.goalDifference > 0 ? "+" : ""}
                {team.goalDifference}
              </span>
            </div>

            {/* Clean Sheets */}
            <div className="col-span-2 text-center">
              <span className="text-sm font-black text-blue-600">
                {team.cleanSheets}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Footer Stats Summary */}
      <div className="mt-6 pt-6 border-t-2 border-slate-200">
        <div className="grid grid-cols-4 gap-6 text-center">
          <div>
            <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2">
              Total Goals
            </div>
            <div className="text-2xl font-black text-[#06054e]">
              {teams.reduce((sum, t) => sum + t.goalsFor, 0)}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2">
              Avg/Team
            </div>
            <div className="text-2xl font-black text-[#06054e]">
              {(
                teams.reduce((sum, t) => sum + t.goalsFor, 0) / teams.length
              ).toFixed(1)}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2">
              Clean Sheets
            </div>
            <div className="text-2xl font-black text-[#06054e]">
              {teams.reduce((sum, t) => sum + t.cleanSheets, 0)}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2">
              Best Attack
            </div>
            <div className="text-sm font-black text-[#06054e] uppercase">
              {teams[0].club}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export { tableContainerVariants, tableHeaderVariants, rowVariants };
