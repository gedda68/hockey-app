import React from "react";
import Link from "next/link";
import StandingsTableFull from "../../../../components/standings/StandingsTableFull";
import PageHeader from "../../../../components/shared/PageHeader";
import FilterButton from "../../../../components/shared/FilterButton";

import {
  getLiveStandingsDivision,
  listPublicSeasonCompetitions,
} from "../../../../lib/data/liveStandings";

export const dynamic = "force-dynamic";

export default async function StandingsPage({
  searchParams,
}: {
  searchParams: {
    seasonCompetitionId?: string;
  };
}) {
  const params = await searchParams;
  const seasonCompetitions = await listPublicSeasonCompetitions();
  const selectedId =
    params.seasonCompetitionId ||
    seasonCompetitions[0]?.seasonCompetitionId ||
    "";

  const selectedMeta = seasonCompetitions.find(
    (s) => s.seasonCompetitionId === selectedId,
  );
  const currentYear = selectedMeta?.season || seasonCompetitions[0]?.season || "—";

  const finalDivision = selectedId
    ? await getLiveStandingsDivision(selectedId)
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#06054e] via-slate-900 to-slate-800 px-4 md:px-8 lg:px-12 w-full ">
      {/* Back Button */}
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

      {/* Page Header */}
      <div className="flex flex-col mb-10 border-b-4 border-[#06054e] pb-6">
        <PageHeader title="League" highlight="Standings" />

        {/* Filters */}
        <div className="flex flex-wrap gap-x-12 gap-y-6">
          {/* Season competition filter */}
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">
              Competition
            </span>
            <div className="flex gap-2 flex-wrap">
              {seasonCompetitions.map((sc) => (
                <FilterButton
                  key={sc.seasonCompetitionId}
                  href={`/competitions/standings?seasonCompetitionId=${sc.seasonCompetitionId}`}
                  isActive={selectedId === sc.seasonCompetitionId}
                  variant="primary"
                >
                  {sc.competitionName ?? sc.competitionId} {sc.season}
                </FilterButton>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Standings Table */}
      <div className="max-w-4xl mx-auto">
        {finalDivision ? (
          <StandingsTableFull
            division={finalDivision}
            currentYear={currentYear}
          />
        ) : (
          <div className="bg-white rounded-3xl p-20 text-center">
            <p className="text-slate-400 font-black uppercase italic tracking-widest">
              No standings available for {currentYear}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
