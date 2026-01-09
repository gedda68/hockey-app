// components/matches/FilterBar.tsx
import React from "react";
import Link from "next/link";

interface FilterBarProps {
  seasons: { year: number; isCurrent: boolean }[];
  divisions: string[];
  clubs: string[];
  currentParams: {
    selectedType: string;
    selectedYear: string;
    selectedDiv: string;
    selectedClub: string;
  };
}

export default function FilterBar({
  seasons,
  divisions,
  clubs,
  currentParams,
}: FilterBarProps) {
  const { selectedType, selectedYear, selectedDiv, selectedClub } =
    currentParams;

  return (
    <div className="flex flex-wrap gap-x-10 gap-y-6">
      {/* Season Filter - Only visible for Results */}
      {selectedType === "results" && (
        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">
            Season
          </span>
          <div className="flex gap-2">
            {seasons.map((s) => (
              <Link
                key={s.year}
                href={`?type=results&year=${s.year}&div=${selectedDiv}&club=${selectedClub}`}
                className={`px-4 py-2 rounded-full text-[10px] font-black border transition-all ${
                  selectedYear === s.year.toString()
                    ? "bg-red-600 text-white border-red-600 shadow-md"
                    : "bg-white text-slate-500 border-slate-200 hover:border-[#06054e]"
                }`}
              >
                {s.year}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Division Filter */}
      <div className="flex flex-col gap-2">
        <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">
          Division
        </span>
        <div className="flex gap-2 flex-wrap">
          {divisions.map((div) => (
            <Link
              key={div}
              href={`?type=${selectedType}&year=${selectedYear}&div=${div}&club=${selectedClub}`}
              className={`px-4 py-2 rounded-full text-[10px] font-black border transition-all ${
                selectedDiv === div
                  ? "bg-[#06054e] text-white border-[#06054e] shadow-md"
                  : "bg-white text-slate-500 border-slate-200 hover:border-[#06054e]"
              }`}
            >
              {div}
            </Link>
          ))}
        </div>
      </div>

      {/* Club Search/Select */}
      <div className="flex flex-col gap-2">
        <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">
          Club
        </span>
        <select
          value={selectedClub}
          onChange={(e) => {
            window.location.href = `?type=${selectedType}&year=${selectedYear}&div=${selectedDiv}&club=${e.target.value}`;
          }}
          className="bg-white border-2 border-slate-200 rounded-full px-6 py-2 text-[10px] font-black uppercase outline-none focus:border-[#06054e] appearance-none cursor-pointer"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e\")",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "right 1rem center",
            backgroundSize: "1em",
          }}
        >
          {clubs.map((club) => (
            <option key={club} value={club}>
              {club}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
