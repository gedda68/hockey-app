"use client";

import FavouriteStar from "./FavouriteStar";
import { useLocalFavourites } from "@/lib/favourites/useLocalFavourites";

/** Favourite toggle for a team row, so server-rendered ladders can include it. */
export default function TeamFavouriteStar({
  teamId,
  clubId,
  name,
}: {
  teamId: string;
  clubId?: string;
  name: string;
}) {
  const { isTeamFavourite, toggleFavouriteTeam } = useLocalFavourites();
  return (
    <FavouriteStar
      label={name}
      active={isTeamFavourite(teamId)}
      onToggle={() => toggleFavouriteTeam({ teamId, clubId, name })}
    />
  );
}
