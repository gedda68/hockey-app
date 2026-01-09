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
  assists: number;
  matches: number;
  assistsPerMatch: number;
}

interface TopAssistsTableProps {
  division: string;
  year: string;
}

export default function TopAssistsTable({
  division,
  year,
}: TopAssistsTableProps) {
  // Mock data - replace with actual data fetching
  const players: Player[] = [
    {
      rank: 1,
      name: "Alex Rodriguez",
      club: "Easts",
      clubIcon: "/icons/easts.svg",
      assists: 18,
      matches: 16,
      assistsPerMatch: 1.13,
    },
    {
      rank: 2,
      name: "Ben Thompson",
      club: "Commercial",
      clubIcon: "/icons/commercial.svg",
      assists: 16,
      matches: 15,
      assistsPerMatch: 1.07,
    },
    {
      rank: 3,
      name: "Chris Walker",
      club: "Valleys",
      clubIcon: "/icons/valleys.svg",
      assists: 14,
      matches: 14,
      assistsPerMatch: 1.0,
    },
    {
      rank: 4,
      name: "Daniel Park",
      club: "Souths United",
      clubIcon: "/icons/souths.svg",
      assists: 13,
      matches: 16,
      assistsPerMatch: 0.81,
    },
    {
      rank: 5,
      name: "Ethan Moore",
      club: "Kedron Wavell",
      clubIcon: "/icons/kedron.svg",
      assists: 12,
      matches: 15,
      assistsPerMatch: 0.8,
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
          Top Assists
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
        <div className="col-span-3 text-right">Assists</div>
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

            {/* Assists */}
            <div className="col-span-3 text-right">
              <span className="text-lg font-black text-blue-600">
                {player.assists}
              </span>
              <span className="text-[9px] font-bold text-slate-400 ml-2">
                ({player.assistsPerMatch.toFixed(2)}/match)
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Footer Stats */}
      <div className="mt-6 pt-4 border-t border-slate-200">
        <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-400">
          <span>Total Assists</span>
          <span className="text-[#06054e] text-sm">
            {players.reduce((sum, p) => sum + p.assists, 0)}
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
