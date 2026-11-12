"use client";

import { Star } from "lucide-react";
import { cn } from "../../lib/utils";

interface FavouriteStarProps {
  active: boolean;
  /** What is being favourited, e.g. a team or league name — used for the accessible label. */
  label: string;
  onToggle: () => void;
  className?: string;
}

/** Small star toggle. A real <button> so it is keyboard- and screen-reader-friendly. */
export default function FavouriteStar({
  active,
  label,
  onToggle,
  className,
}: FavouriteStarProps) {
  return (
    <button
      type="button"
      onClick={(e) => {
        // Rows can sit inside clickable containers — never let the star trigger them.
        e.preventDefault();
        e.stopPropagation();
        onToggle();
      }}
      aria-pressed={active}
      aria-label={active ? `Remove ${label} from favourites` : `Add ${label} to favourites`}
      title={active ? "Remove from favourites" : "Add to favourites"}
      className={cn(
        "shrink-0 rounded p-1 transition-colors hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300",
        active ? "text-yellow-300" : "text-slate-500 hover:text-yellow-200",
        className,
      )}
    >
      <Star
        className="h-3.5 w-3.5"
        fill={active ? "currentColor" : "none"}
        aria-hidden="true"
      />
    </button>
  );
}
