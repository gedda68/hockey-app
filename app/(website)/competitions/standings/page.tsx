import React from "react";
import Link from "next/link";
import StandingsTableFull from "../../../../components/standings/StandingsTableFull";
import PageHeader from "../../../../components/shared/PageHeader";
import FilterButton from "../../../../components/shared/FilterButton";
import type { Division } from "../../../types";

// Import data utility functions
import {
  getStandingsYears,
  getDivisionsByYear,
} from "../../../../lib/data/standings";

export const dynamic = "force-dynamic";

export default async function StandingsPage({
  searchParams,
}: {
  searchParams: {
    div?: string;
    year?: string;
  };
}) {
  // 1. Get available years
  const availableYears = await getStandingsYears();

  // 2. Resolve current year
  const params = await searchParams;
  const currentYear = params.year || availableYears[0] || "2025";

  // 3. Get divisions for current year only
  const divisionsForYear = await getDivisionsByYear(currentYear);

  // 4. Get division names for current year
  const divisionNamesForYear = divisionsForYear.map((d) => d.divisionName);

  // 5. Resolve current division
  const currentDivName = params.div || divisionsForYear[0]?.divisionName;

  // 6. Check if current division exists in selected year
  const currentDivision = divisionsForYear.find(
    (d) => d.divisionName === currentDivName
  );

  // 7. If division doesn't exist in this year, use first available division
  const finalDivision = currentDivision || divisionsForYear[0];
  const finalDivName = finalDivision?.divisionName || currentDivName;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-12 w-full font-sans text-slate-900">
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
          {/* Year Filter */}
          {availableYears.length > 1 && (
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">
                Season
              </span>
              <div className="flex gap-2">
                {availableYears.map((year) => (
                  <FilterButton
                    key={year}
                    href={`/competitions/standings?year=${year}`}
                    isActive={currentYear === year}
                    variant="primary"
                  >
                    {year}
                  </FilterButton>
                ))}
              </div>
            </div>
          )}

          {/* Division Filter - Only shows divisions for current year */}
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">
              Division
            </span>
            <div className="flex gap-2 flex-wrap">
              {divisionNamesForYear.map((divName) => (
                <FilterButton
                  key={divName}
                  href={`/competitions/standings?year=${currentYear}&div=${divName}`}
                  isActive={finalDivName === divName}
                  variant="primary"
                >
                  {divName}
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
