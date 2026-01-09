import FilterButton from "../shared/FilterButton";
import type { Season, ViewType } from "../../types";

interface MatchFiltersProps {
  seasons: Season[];
  divisions: string[];
  rounds: string[];
  statuses: string[];
  selectedYear: string;
  selectedDiv: string;
  selectedRound: string;
  selectedStatus: string;
  selectedView: ViewType;
}

export default function MatchFilters({
  seasons,
  divisions,
  rounds,
  statuses,
  selectedYear,
  selectedDiv,
  selectedRound,
  selectedStatus,
  selectedView,
}: MatchFiltersProps) {
  const buildUrl = (params: Record<string, string>) => {
    const searchParams = new URLSearchParams({
      view: selectedView,
      div: selectedDiv,
      round: selectedRound,
      status: selectedStatus,
      year: selectedYear,
      ...params,
    });
    return `/competitions/matches?${searchParams.toString()}`;
  };

  return (
    <div className="flex flex-wrap gap-x-12 gap-y-6">
      {/* Year Filter */}
      {seasons.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">
            Season
          </span>
          <div className="flex gap-2">
            {seasons.map((season) => (
              <FilterButton
                key={season.year}
                href={buildUrl({ year: season.year.toString() })}
                isActive={selectedYear === season.year.toString()}
                variant="primary"
              >
                {season.year}
              </FilterButton>
            ))}
          </div>
        </div>
      )}

      {/* Status Filter */}
      <div className="flex flex-col gap-2">
        <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">
          {selectedView === "upcoming" ? "Status" : "Match Status"}
        </span>
        <div className="flex gap-2">
          {statuses.map((stat) => (
            <FilterButton
              key={stat}
              href={buildUrl({ status: stat })}
              isActive={selectedStatus === stat}
              variant="status"
            >
              {stat}
            </FilterButton>
          ))}
        </div>
      </div>

      {/* Division Filter */}
      <div className="flex flex-col gap-2">
        <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">
          Division
        </span>
        <div className="flex gap-2 flex-wrap">
          {divisions.map((div) => (
            <FilterButton
              key={div}
              href={buildUrl({ div })}
              isActive={selectedDiv === div}
              variant="primary"
            >
              {div}
            </FilterButton>
          ))}
        </div>
      </div>
    </div>
  );
}
