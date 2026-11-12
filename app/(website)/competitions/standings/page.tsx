import React from "react";
import Link from "next/link";
import StandingsTableFull from "../../../../components/standings/StandingsTableFull";
import PageHeader from "../../../../components/shared/PageHeader";
import CompetitionPicker from "../../../../components/shared/CompetitionPicker";
import { buildCompetitionPicker } from "../../../../lib/competitions/competitionPickerOptions";

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

        {/* Competition picker */}
        <CompetitionPicker
          selectedId={selectedId}
          seasons={buildCompetitionPicker(
            seasonCompetitions.map((sc) => ({
              ...sc,
              href: `/competitions/standings?seasonCompetitionId=${encodeURIComponent(sc.seasonCompetitionId)}`,
            })),
          )}
        />
      </div>

      {/* Standings Table */}
      <div className="max-w-5xl mx-auto pb-16">
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
