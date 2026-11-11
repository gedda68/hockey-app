import FilterButton from "../shared/FilterButton";
import CompetitionPicker from "../shared/CompetitionPicker";
import { buildCompetitionPicker } from "@/lib/competitions/competitionPickerOptions";
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
  /** Keep a team filter (from the ladder) while changing round/status. */
  selectedTeamId?: string;
}

export default function MatchFilters({
  seasonCompetitions,
  rounds,
  statuses,
  selectedSeasonCompetitionId,
  selectedRound,
  selectedStatus,
  selectedView,
  selectedTeamId,
}: MatchFiltersProps) {
  const buildUrl = (params: Record<string, string>) => {
    const searchParams = new URLSearchParams({
      view: selectedView,
      seasonCompetitionId: selectedSeasonCompetitionId,
      round: selectedRound,
      status: selectedStatus,
      ...params,
    });
    // A team belongs to one season competition: drop the team filter when switching competitions
    if (selectedTeamId && !("seasonCompetitionId" in params)) searchParams.set("teamId", selectedTeamId);
    return `/competitions/matches?${searchParams.toString()}`;
  };

  return (
    <div className="flex flex-wrap gap-x-12 gap-y-6">
      {/* Competition + Season (seasonCompetition) picker */}
      {seasonCompetitions.length > 0 && (
        <div className="w-full">
          <CompetitionPicker
            selectedId={selectedSeasonCompetitionId}
            seasons={buildCompetitionPicker(
              seasonCompetitions.map((sc) => ({
                ...sc,
                // a new competition resets round + team
                href: buildUrl({ seasonCompetitionId: sc.seasonCompetitionId, round: "All" }),
              })),
            )}
          />
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
