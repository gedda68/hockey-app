import Image from "next/image";
import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils";
import Text from "../ui/Text";
import type { Team } from "../../types";

const rowVariants = cva(
  "grid grid-cols-12 items-center bg-white/5 hover:bg-white/10 p-2 rounded-lg text-xs transition-colors cursor-pointer"
);

const positionVariants = cva("col-span-1 font-black", {
  variants: {
    zone: {
      promotion: "text-green-400",
      safe: "text-slate-400",
      relegation: "text-red-400",
    },
  },
  defaultVariants: {
    zone: "safe",
  },
});

const goalDiffVariants = cva("col-span-2 text-center font-bold", {
  variants: {
    value: {
      positive: "text-green-400",
      zero: "text-slate-400",
      negative: "text-red-400",
    },
  },
  defaultVariants: {
    value: "zero",
  },
});

const pointsVariants = cva("col-span-2 text-right font-black text-blue-400");

interface StandingsRowProps {
  team: Team;
  promotionZone?: number; // Top N teams
  relegationZone?: number; // Bottom N teams
  totalTeams?: number;
}

export default function StandingsRow({
  team,
  promotionZone = 3,
  relegationZone = 2,
  totalTeams = 10,
}: StandingsRowProps) {
  const goalDiff = team.goalDifference || 0;

  // Determine position zone
  const getPositionZone = () => {
    if (team.pos <= promotionZone) return "promotion";
    if (team.pos > totalTeams - relegationZone) return "relegation";
    return "safe";
  };

  // Determine goal difference category
  const getGoalDiffValue = () => {
    if (goalDiff > 0) return "positive";
    if (goalDiff < 0) return "negative";
    return "zero";
  };

  return (
    <div className={rowVariants()}>
      {/* Position */}
      <div className={positionVariants({ zone: getPositionZone() })}>
        {team.pos}
      </div>

      {/* Team Name & Logo */}
      <div className="col-span-5 flex items-center gap-2">
        <Image
          src={team.icon}
          alt={team.club}
          width={16}
          height={16}
          className="shrink-0"
        />
        <Text className="font-bold uppercase text-[10px] truncate text-white">
          {team.club}
        </Text>
      </div>

      {/* Played */}
      <div className="col-span-2 text-center font-bold text-slate-300">
        {team.played || 0}
      </div>

      {/* Goal Difference */}
      <div className={goalDiffVariants({ value: getGoalDiffValue() })}>
        {goalDiff > 0 ? "+" : ""}
        {goalDiff}
      </div>

      {/* Points */}
      <div className={pointsVariants()}>{team.pts}</div>
    </div>
  );
}

export { rowVariants, positionVariants, goalDiffVariants, pointsVariants };
