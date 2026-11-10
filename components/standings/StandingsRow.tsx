"use client";

import Image from "next/image";
import Link from "next/link";
import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils";
import Text from "../ui/Text";
import type { Team } from "../../types";
import EntityColorBar from "@/components/ui/EntityColorBar";
import FavouriteStar from "@/components/favourites/FavouriteStar";
import { useLocalFavourites } from "@/lib/favourites/useLocalFavourites";

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
  promotionZone?: number;
  relegationZone?: number;
  totalTeams?: number;
}

export default function StandingsRow({
  team,
  promotionZone = 3,
  relegationZone = 2,
  totalTeams = 10,
}: StandingsRowProps) {
  const { isTeamFavourite, toggleFavouriteTeam } = useLocalFavourites();

  // Link to the team page only when we know both ids.
  const teamHref =
    team.clubId && team.teamId
      ? `/clubs/${encodeURIComponent(team.clubId)}/teams/${encodeURIComponent(team.teamId)}`
      : null;

  // Use 'gd' from JSON (goal difference)
  const goalDiff = team.gd || team.goalDifference || 0;
  // Use 'p' from JSON (played)
  const played = team.p || team.played || 0;

  // Determine position zone
  const getPositionZone = () => {
    const pos = team.pos;
    if (pos == null) return "safe";
    if (pos <= promotionZone) return "promotion";
    if (pos > totalTeams - relegationZone) return "relegation";
    return "safe";
  };

  // Determine goal difference category
  const getGoalDiffValue = () => {
    if (goalDiff > 0) return "positive";
    if (goalDiff < 0) return "negative";
    return "zero";
  };

  return (
    <div className={cn(rowVariants(), "flex items-center gap-0 overflow-hidden rounded-lg")}>
      {/* Club colour stripe */}
      {(team.primaryColor || team.secondaryColor) && (
        <EntityColorBar
          primary={team.primaryColor}
          secondary={team.secondaryColor}
          className="mr-2"
        />
      )}

      {/* Position */}
      <div className={cn(positionVariants({ zone: getPositionZone() }), "w-6 shrink-0")}>
        {team.pos ?? "—"}
      </div>

      {/* Team Name & Logo */}
      <div className="flex-1 flex items-center gap-2 min-w-0">
        {team.icon && (
          <Image
            src={team.icon}
            alt={team.club}
            width={16}
            height={16}
            className="shrink-0"
          />
        )}
        {teamHref ? (
          <Link
            href={teamHref}
            className="min-w-0 truncate hover:underline focus-visible:underline"
          >
            <Text className="font-bold uppercase text-[10px] truncate text-white">
              {team.club}
            </Text>
          </Link>
        ) : (
          <Text className="font-bold uppercase text-[10px] truncate text-white">
            {team.club}
          </Text>
        )}
        {team.teamId && (
          <FavouriteStar
            label={team.club}
            active={isTeamFavourite(team.teamId)}
            onToggle={() =>
              toggleFavouriteTeam({
                teamId: team.teamId as string,
                clubId: team.clubId,
                name: team.club,
              })
            }
          />
        )}
      </div>

      {/* Played */}
      <div className="col-span-2 text-center font-bold text-slate-300">
        {played}
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
