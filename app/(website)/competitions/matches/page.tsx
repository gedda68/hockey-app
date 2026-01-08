import React from "react";
import Link from "next/link";
import MatchList from "../../../components/matches/MatchList";
import MatchFilters from "../../../components/matches/MatchFilters";
import PageHeader from "../../../components/shared/PageHeader";
import StandingsTable from "../../../components/standings/StandingsTable";
import type { ViewType } from "../../../types";

// Import data utility functions
import {
  filterMatches,
  getDivisions,
  getRounds,
  getSeasons,
  getCurrentSeason,
  getMatchStatsData,
  getUmpireAllocationsMap,
  getUmpireList,
} from "../../../lib/data";

import {
  getDivisionStandings,
  getStandingsYears,
} from "../../../lib/data/standings";

export const dynamic = "force-dynamic";

export default async function MatchesPage({
  searchParams,
}: {
  searchParams: {
    div?: string;
    round?: string;
    status?: string;
    view?: string;
    year?: string;
    standingsYear?: string;
  };
}) {
  // 1. PARAMS
  const params = await searchParams;
  const selectedDiv = params.div || "All";
  const selectedRound = params.round || "All";
  const selectedStatus = params.status || "All";
  const selectedView: ViewType = (params.view as ViewType) || "results";

  // 2. DATA LOADING using utility functions
  const [
    seasons,
    currentSeason,
    divisions,
    rounds,
    filteredMatches,
    statsData,
    umpireAllocations,
    umpireList,
    standingsYears,
  ] = await Promise.all([
    getSeasons(),
    getCurrentSeason(),
    getDivisions(selectedView),
    getRounds(selectedView),
    filterMatches({
      type: selectedView,
      division: selectedDiv,
      round: selectedRound,
      status: selectedStatus,
    }),
    getMatchStatsData(),
    getUmpireAllocationsMap(),
    getUmpireList(),
    getStandingsYears(),
  ]);

  const selectedYear = params.year || currentSeason?.year.toString() || "2026";
  const standingsYear = params.standingsYear || standingsYears[0] || "2025";

  // Get standings for selected division and year
  const currentStandings =
    selectedDiv !== "All"
      ? await getDivisionStandings(selectedDiv, standingsYear)
      : null;

  const statuses =
    selectedView === "upcoming"
      ? ["All", "Scheduled"]
      : ["All", "Live", "Final"];

  // View toggle buttons
  const viewToggle = (
    <>
      <Link
        href={`/competitions/matches?view=results&div=${selectedDiv}&round=${selectedRound}&status=All&year=${selectedYear}&standingsYear=${standingsYear}`}
        className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all shadow-lg ${
          selectedView === "results"
            ? "bg-red-600 text-white"
            : "bg-white text-slate-600 hover:bg-slate-100"
        }`}
      >
        Results
      </Link>
      <Link
        href={`/competitions/matches?view=upcoming&div=${selectedDiv}&round=${selectedRound}&status=All&year=${selectedYear}&standingsYear=${standingsYear}`}
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
    <div className="min-h-screen bg-slate-50 p-4 md:p-12 w-full font-sans text-slate-900">
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

        <MatchFilters
          seasons={seasons}
          divisions={divisions}
          rounds={rounds}
          statuses={statuses}
          selectedYear={selectedYear}
          selectedDiv={selectedDiv}
          selectedRound={selectedRound}
          selectedStatus={selectedStatus}
          selectedView={selectedView}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
        <div className="xl:col-span-8">
          {filteredMatches.length > 0 ? (
            <MatchList
              matches={filteredMatches}
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
            selectedDiv={selectedDiv}
            availableYears={standingsYears}
            currentYear={standingsYear}
          />
        </div>
      </div>
    </div>
  );
}
