import FilterButton from "../shared/FilterButton";
import type { ViewType } from "../../types";
import type { SeasonCompetitionOption } from "@/lib/data/matches";

interface MatchFiltersProps {
  seasonCompetitions: SeasonCompetitionOption[];
  rounds: string[];
  statuses: string[];
  selectedSeasonCompetitionId: string;
  selectedRound: string;
  selectedStatus: string;
  selectedView: ViewType;
}

export default function MatchFilters({
  seasonCompetitions,
  rounds,
  statuses,
  selectedSeasonCompetitionId,
  selectedRound,
  selectedStatus,
  selectedView,
}: MatchFiltersProps) {
  const buildUrl = (params: Record<string, string>) => {
    const searchParams = new URLSearchParams({
      view: selectedView,
      seasonCompetitionId: selectedSeasonCompetitionId,
      round: selectedRound,
      status: selectedStatus,
      ...params,
    });
    return `/competitions/matches?${searchParams.toString()}`;
  };

  return (
    <div className="flex flex-wrap gap-x-12 gap-y-6">
      {/* Competition + Season (seasonCompetition) Filter */}
      {seasonCompetitions.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">
            Competition
          </span>
          <div className="flex gap-2">
            {seasonCompetitions.map((sc) => (
              <FilterButton
                key={sc.seasonCompetitionId}
                href={buildUrl({ seasonCompetitionId: sc.seasonCompetitionId })}
                isActive={selectedSeasonCompetitionId === sc.seasonCompetitionId}
                variant="primary"
              >
                {sc.label}
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
          Round
        </span>
        <div className="flex gap-2 flex-wrap">
          {rounds.map((round) => (
            <FilterButton
              key={round}
              href={buildUrl({ round })}
              isActive={selectedRound === round}
              variant="primary"
            >
              {round}
            </FilterButton>
          ))}
        </div>
      </div>
    </div>
  );
}
