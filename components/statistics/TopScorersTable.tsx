"use client";

import Image from "next/image";
import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils";

const tableContainerVariants = cva("bg-white rounded-3xl p-6 shadow-lg");

const tableHeaderVariants = cva(
  "grid grid-cols-12 items-center px-4 pb-3 border-b-2 border-slate-200 text-[8px] font-black uppercase text-slate-400 tracking-wider"
);

const rowVariants = cva(
  "grid grid-cols-12 items-center px-4 py-3 hover:bg-slate-50 transition-colors rounded-xl cursor-pointer"
);

const rankVariants = cva("font-black text-sm", {
  variants: {
    position: {
      first: "text-yellow-500",
      second: "text-slate-400",
      third: "text-amber-600",
      other: "text-slate-600",
    },
  },
  defaultVariants: {
    position: "other",
  },
});

interface Player {
  rank: number;
  name: string;
  club: string;
  clubIcon: string;
  goals: number;
  matches: number;
  goalsPerMatch: number;
}

interface TopScorersTableProps {
  division: string;
  year: string;
}

export default function TopScorersTable({
  division,
  year,
}: TopScorersTableProps) {
  // Mock data - replace with actual data fetching
  const players: Player[] = [
    {
      rank: 1,
      name: "James Mitchell",
      club: "Commercial",
      clubIcon: "/icons/commercial.svg",
      goals: 28,
      matches: 15,
      goalsPerMatch: 1.87,
    },
    {
      rank: 2,
      name: "Tom Wilson",
      club: "Easts",
      clubIcon: "/icons/easts.svg",
      goals: 24,
      matches: 16,
      goalsPerMatch: 1.5,
    },
    {
      rank: 3,
      name: "David Chen",
      club: "Souths United",
      clubIcon: "/icons/souths.svg",
      goals: 22,
      matches: 14,
      goalsPerMatch: 1.57,
    },
    {
      rank: 4,
      name: "Marcus Taylor",
      club: "Valleys",
      clubIcon: "/icons/valleys.svg",
      goals: 20,
      matches: 16,
      goalsPerMatch: 1.25,
    },
    {
      rank: 5,
      name: "Ryan Patterson",
      club: "Kedron Wavell",
      clubIcon: "/icons/kedron.svg",
      goals: 19,
      matches: 15,
      goalsPerMatch: 1.27,
    },
  ];

  const getRankPosition = (rank: number) => {
    if (rank === 1) return "first";
    if (rank === 2) return "second";
    if (rank === 3) return "third";
    return "other";
  };

  return (
    <div className={tableContainerVariants()}>
      {/* Header */}
      <div className="mb-6 pb-4 border-b-2 border-[#06054e]">
        <h3 className="text-lg font-black uppercase italic text-[#06054e] mb-1">
          Top Scorers
        </h3>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
          {division} · {year} Season
        </p>
      </div>

      {/* Table Header */}
      <div className={tableHeaderVariants()}>
        <div className="col-span-1">#</div>
        <div className="col-span-6">Player</div>
        <div className="col-span-2 text-center">Matches</div>
        <div className="col-span-3 text-right">Goals</div>
      </div>

      {/* Player Rows */}
      <div className="space-y-1 mt-2">
        {players.map((player) => (
          <div key={player.rank} className={rowVariants()}>
            {/* Rank */}
            <div
              className={cn(
                "col-span-1",
                rankVariants({ position: getRankPosition(player.rank) })
              )}
            >
              {player.rank}
            </div>

            {/* Player Info */}
            <div className="col-span-6 flex items-center gap-3">
              <div className="relative w-5 h-5 shrink-0">
                <Image
                  src={player.clubIcon}
                  alt={player.club}
                  fill
                  className="object-contain"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-black text-slate-900">
                  {player.name}
                </span>
                <span className="text-[9px] font-bold text-slate-500 uppercase">
                  {player.club}
                </span>
              </div>
            </div>

            {/* Matches Played */}
            <div className="col-span-2 text-center text-xs font-bold text-slate-600">
              {player.matches}
            </div>

            {/* Goals */}
            <div className="col-span-3 text-right">
              <span className="text-lg font-black text-red-600">
                {player.goals}
              </span>
              <span className="text-[9px] font-bold text-slate-400 ml-2">
                ({player.goalsPerMatch.toFixed(2)}/match)
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Footer Stats */}
      <div className="mt-6 pt-4 border-t border-slate-200">
        <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-400">
          <span>Total Goals</span>
          <span className="text-[#06054e] text-sm">
            {players.reduce((sum, p) => sum + p.goals, 0)}
          </span>
        </div>
      </div>
    </div>
  );
}

export {
  tableContainerVariants,
  tableHeaderVariants,
  rowVariants,
  rankVariants,
};
