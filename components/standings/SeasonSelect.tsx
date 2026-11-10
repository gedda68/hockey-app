"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import FavouriteStar from "@/components/favourites/FavouriteStar";
import { useLocalFavourites } from "@/lib/favourites/useLocalFavourites";

export type SeasonOption = {
  seasonCompetitionId: string;
  season: string;
  competitionId: string;
  competitionName: string | null;
};

interface SeasonSelectProps {
  options: SeasonOption[];
  selectedId: string;
}

/**
 * Competition + season dropdown for /competitions/standings.
 * Options are grouped by competition (newest season first inside each group).
 * Navigation still goes through ?seasonCompetitionId=, so existing links keep working.
 */
export default function SeasonSelect({ options, selectedId }: SeasonSelectProps) {
  const router = useRouter();
  const { isLeagueFavourite, toggleFavouriteLeague } = useLocalFavourites();

  const groups = useMemo(() => {
    const byCompetition = new Map<string, { label: string; items: SeasonOption[] }>();
    for (const o of options) {
      const g = byCompetition.get(o.competitionId) ?? {
        label: o.competitionName ?? o.competitionId,
        items: [],
      };
      g.items.push(o);
      byCompetition.set(o.competitionId, g);
    }
    return [...byCompetition.values()]
      .map((g) => ({
        ...g,
        items: [...g.items].sort((a, b) => b.season.localeCompare(a.season)),
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [options]);

  const selected = options.find((o) => o.seasonCompetitionId === selectedId);
  const selectedLabel = selected
    ? `${selected.competitionName ?? selected.competitionId} ${selected.season}`
    : "";

  if (options.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      <select
        id="standings-season-select"
        aria-label="Competition and season"
        value={selectedId}
        onChange={(e) =>
          router.push(
            `/competitions/standings?seasonCompetitionId=${encodeURIComponent(e.target.value)}`,
            { scroll: false },
          )
        }
        className="min-w-[14rem] rounded-full border border-white/20 bg-white px-4 py-2 text-[11px] font-black uppercase tracking-wide text-[#06054e] shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300"
      >
        {groups.map((g) => (
          <optgroup key={g.label} label={g.label}>
            {g.items.map((o) => (
              <option key={o.seasonCompetitionId} value={o.seasonCompetitionId}>
                {g.label} {o.season}
              </option>
            ))}
          </optgroup>
        ))}
      </select>

      {selected && (
        <FavouriteStar
          label={selectedLabel}
          active={isLeagueFavourite(selected.seasonCompetitionId)}
          onToggle={() =>
            toggleFavouriteLeague({
              seasonCompetitionId: selected.seasonCompetitionId,
              name: selectedLabel,
            })
          }
        />
      )}
    </div>
  );
}
