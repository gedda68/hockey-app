import React from "react";
import Link from "next/link";
import MatchList from "../../../../components/matches/MatchList";
import MatchFilters from "../../../../components/matches/MatchFilters";
import PageHeader from "../../../../components/shared/PageHeader";
import StandingsTable from "../../../../components/standings/StandingsTable";
import MyFixturesStrip from "../../../../components/matches/MyFixturesStrip";
import type { ViewType } from "../../../../types";

// Import data utility functions
import {
  filterMatches,
  getSeasonCompetitionOptions,
  getRoundsForSeasonCompetition,
  getMatchStatsData,
  getUmpireDetailsList,
  resolveUmpireAllocationsForMatches,
} from "../../../../lib/data";

import { getLiveStandingsDivision } from "../../../../lib/data/liveStandings";

export const dynamic = "force-dynamic";

export default async function MatchesPage({
  searchParams,
}: {
  searchParams: {
    seasonCompetitionId?: string;
    round?: string;
    status?: string;
    view?: string;
  };
}) {
  // 1. PARAMS
  const params = await searchParams;
  const selectedRound = params.round || "All";
  const selectedStatus = params.status || "All";
  const selectedView: ViewType = (params.view as ViewType) || "results";

  // 2. DATA LOADING (live)
  const [seasonCompetitions, statsData, umpireList] = await Promise.all([
    getSeasonCompetitionOptions(),
    getMatchStatsData(),
    getUmpireDetailsList(),
  ]);

  const selectedSeasonCompetitionId =
    params.seasonCompetitionId ||
    seasonCompetitions[0]?.seasonCompetitionId ||
    "";

  const rounds = selectedSeasonCompetitionId
    ? await getRoundsForSeasonCompetition(selectedSeasonCompetitionId)
    : ["All"];

  // Re-filter with seasonCompetitionId applied (keeps initial parallelism cheap)
  const filteredMatchesFinal = await filterMatches({
    view: selectedView,
    seasonCompetitionId: selectedSeasonCompetitionId || undefined,
    round: selectedRound,
    status: selectedStatus,
  });

  const umpireAllocations =
    await resolveUmpireAllocationsForMatches(filteredMatchesFinal);

  const selectedMeta = seasonCompetitions.find(
    (s) => s.seasonCompetitionId === selectedSeasonCompetitionId,
  );
  const currentStandings = selectedSeasonCompetitionId
    ? await getLiveStandingsDivision(selectedSeasonCompetitionId)
    : null;

  const statuses =
    selectedView === "upcoming"
      ? ["All", "Scheduled"]
      : ["All", "Live", "Final"];

  // View toggle buttons
  const viewToggle = (
    <>
      <Link
        href={`/competitions/matches?view=results&seasonCompetitionId=${selectedSeasonCompetitionId}&round=${selectedRound}&status=All`}
        className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all shadow-lg ${
          selectedView === "results"
            ? "bg-red-600 text-white"
            : "bg-white text-slate-600 hover:bg-slate-100"
        }`}
      >
        Results
      </Link>
      <Link
        href={`/competitions/matches?view=upcoming&seasonCompetitionId=${selectedSeasonCompetitionId}&round=${selectedRound}&status=All`}
        className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all shadow-lg ${
          selectedView === "upcoming"
            ? "bg-red-600 text-white"
            : "bg-white text-slate-600 hover:bg-slate-100"
        }`}
      >
        Fixtures
      </Link>
    </>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#06054e] via-slate-900 to-slate-800 px-4 md:px-8 lg:px-12 w-full ">
      <div className="flex justify-between items-center mb-8">
        <Link
          href="/competitions"
          className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-[#06054e] flex items-center gap-2 group"
        >
          <span className="transition-transform group-hover:-translate-x-1">
            ←
          </span>{" "}
          Back to Dashboard
        </Link>
      </div>

      <div className="flex flex-col mb-10 border-b-4 border-[#06054e] pb-6">
        <PageHeader
          title={selectedView === "upcoming" ? "Upcoming" : "Match"}
          highlight={selectedView === "upcoming" ? "Fixtures" : "Results"}
          actions={viewToggle}
        />

        <MyFixturesStrip title="My fixtures" />

        <MatchFilters
          seasonCompetitions={seasonCompetitions}
          rounds={rounds}
          statuses={statuses}
          selectedSeasonCompetitionId={selectedSeasonCompetitionId}
          selectedRound={selectedRound}
          selectedStatus={selectedStatus}
          selectedView={selectedView}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
        <div className="xl:col-span-8">
          {filteredMatchesFinal.length > 0 ? (
            <MatchList
              matches={filteredMatchesFinal}
              stats={selectedView === "results" ? statsData : {}}
              isUpcoming={selectedView === "upcoming"}
              umpireAllocations={umpireAllocations}
              umpireList={umpireList}
            />
          ) : (
            <div className="bg-white rounded-3xl p-8 text-center text-slate-500">
              <p className="text-sm">
                {selectedView === "upcoming"
                  ? "No upcoming fixtures scheduled yet."
                  : "No match results available yet."}
              </p>
              <p className="text-xs mt-2">
                {selectedView === "upcoming"
                  ? "Check back soon for the fixture list!"
                  : "Check back after matches have been played!"}
              </p>
            </div>
          )}
        </div>

        <div className="xl:col-span-4">
          <StandingsTable
            division={currentStandings}
            selectedDiv={selectedMeta?.label ?? "Standings"}
            availableYears={selectedMeta?.season ? [selectedMeta.season] : []}
            currentYear={selectedMeta?.season ?? ""}
            showYearFilter={false}
          />
        </div>
      </div>
    </div>
  );
}
