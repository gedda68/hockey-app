import React from "react";
import Link from "next/link";
import PageHeader from "../../../components/shared/PageHeader";
import FilterButton from "../../../components/shared/FilterButton";
import StatisticsCard from "../../../components/statistics/StatisticsCard";
import TopScorersTable from "../../../components/statistics/TopScorersTable";
import TopAssistsTable from "../../../components/statistics/TopAssistsTable";
import TeamStatsTable from "../../../components/statistics/TeamStatsTable";

export const dynamic = "force-dynamic";

export default async function StatisticsPage({
  searchParams,
}: {
  searchParams: {
    div?: string;
    year?: string;
    category?: string;
  };
}) {
  const params = await searchParams;
  const selectedDiv = params.div || "BHL1";
  const selectedYear = params.year || "2025";
  const selectedCategory = params.category || "players";

  // Mock data - replace with actual data fetching
  const divisions = ["BHL1", "BHL2", "PLM", "PL1", "PL2"];
  const years = ["2025", "2024", "2023"];
  const categories = [
    { value: "players", label: "Player Stats" },
    { value: "teams", label: "Team Stats" },
    { value: "matches", label: "Match Stats" },
  ];

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

      {/* Page Header and Filters */}
      <div className="flex flex-col mb-10 border-b-4 border-[#06054e] pb-6">
        <PageHeader title="Competition" highlight="Statistics" />

        {/* Filters */}
        <div className="flex flex-wrap gap-x-10 gap-y-6">
          {/* Season Filter */}
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">
              Season
            </span>
            <div className="flex gap-2">
              {years.map((year) => (
                <FilterButton
                  key={year}
                  href={`/competitions/statistics?year=${year}&div=${selectedDiv}&category=${selectedCategory}`}
                  isActive={selectedYear === year}
                  variant="primary"
                >
                  {year}
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
                  href={`/competitions/statistics?year=${selectedYear}&div=${div}&category=${selectedCategory}`}
                  isActive={selectedDiv === div}
                  variant="secondary"
                >
                  {div}
                </FilterButton>
              ))}
            </div>
          </div>

          {/* Category Filter */}
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">
              Category
            </span>
            <div className="flex gap-2 flex-wrap">
              {categories.map((cat) => (
                <FilterButton
                  key={cat.value}
                  href={`/competitions/statistics?year=${selectedYear}&div=${selectedDiv}&category=${cat.value}`}
                  isActive={selectedCategory === cat.value}
                  variant="secondary"
                >
                  {cat.label}
                </FilterButton>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Content */}
      <div className="space-y-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatisticsCard
            title="Total Goals"
            value="342"
            subtitle="Across all matches"
            trend="+12%"
            trendUp={true}
          />
          <StatisticsCard
            title="Avg Goals/Match"
            value="4.8"
            subtitle="League average"
            trend="+0.3"
            trendUp={true}
          />
          <StatisticsCard
            title="Clean Sheets"
            value="28"
            subtitle="Total shutouts"
            trend="-2"
            trendUp={false}
          />
          <StatisticsCard
            title="Red Cards"
            value="12"
            subtitle="Season total"
            trend="-4"
            trendUp={true}
          />
        </div>

        {/* Main Statistics Tables */}
        {selectedCategory === "players" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <TopScorersTable division={selectedDiv} year={selectedYear} />
            <TopAssistsTable division={selectedDiv} year={selectedYear} />
          </div>
        )}

        {selectedCategory === "teams" && (
          <TeamStatsTable division={selectedDiv} year={selectedYear} />
        )}

        {selectedCategory === "matches" && (
          <div className="bg-white rounded-3xl p-8 shadow-lg">
            <h3 className="text-lg font-black uppercase italic text-[#06054e] mb-6 border-b-2 border-slate-200 pb-4">
              Match Statistics
            </h3>
            <div className="text-center py-12 text-slate-400">
              <p className="text-sm font-bold">Coming Soon</p>
              <p className="text-xs mt-2">
                Detailed match statistics will be available here
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
