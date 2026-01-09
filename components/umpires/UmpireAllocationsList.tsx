"use client";

import { useState } from "react";
import UmpireAllocationCard from "./UmpireAllocationCard";

interface UmpireAllocationsListProps {
  allocations: Array<{
    matchId: string;
    match: {
      division: string;
      homeTeam: { name: string };
      awayTeam: { name: string };
      round: number;
      status: string;
      dateTime: string;
      venue: string;
      score?: { home: number; away: number };
    };
    assignedUmpires: Array<{
      umpireNumber: string;
      firstName: string;
      lastName: string;
      club: string;
      umpireLevel: string;
      email?: string;
      phone?: string;
    }>;
    umpires: Array<{
      umpireId: string;
      role: string;
    }>;
  }>;
}

export default function UmpireAllocationsList({
  allocations,
}: UmpireAllocationsListProps) {
  const [selectedDivision, setSelectedDivision] = useState<string>("All");
  const [selectedStatus, setSelectedStatus] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Get unique divisions
  const divisions = [
    "All",
    ...new Set(allocations.map((a) => a.match.division)),
  ].sort();

  // Filter allocations
  const filteredAllocations = allocations.filter((allocation) => {
    // Division filter
    if (
      selectedDivision !== "All" &&
      allocation.match.division !== selectedDivision
    ) {
      return false;
    }

    // Status filter
    if (
      selectedStatus !== "All" &&
      allocation.match.status !== selectedStatus
    ) {
      return false;
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesTeam =
        allocation.match.homeTeam.name.toLowerCase().includes(query) ||
        allocation.match.awayTeam.name.toLowerCase().includes(query);
      const matchesUmpire = allocation.assignedUmpires.some(
        (u) =>
          u.firstName.toLowerCase().includes(query) ||
          u.lastName.toLowerCase().includes(query)
      );
      if (!matchesTeam && !matchesUmpire) {
        return false;
      }
    }

    return true;
  });

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-3xl p-6 shadow-lg">
        <div className="flex flex-wrap gap-x-10 gap-y-6">
          {/* Division Filter */}
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">
              Division
            </span>
            <div className="flex gap-2 flex-wrap">
              {divisions.map((div) => (
                <button
                  key={div}
                  onClick={() => setSelectedDivision(div)}
                  className={`px-4 py-2 rounded-full text-[10px] font-black border transition-all ${
                    selectedDivision === div
                      ? "bg-[#06054e] text-white border-[#06054e] shadow-md"
                      : "bg-white text-slate-500 border-slate-200 hover:border-[#06054e]"
                  }`}
                >
                  {div}
                </button>
              ))}
            </div>
          </div>

          {/* Status Filter */}
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">
              Status
            </span>
            <div className="flex gap-2">
              {["All", "Scheduled", "Live", "Final"].map((status) => (
                <button
                  key={status}
                  onClick={() => setSelectedStatus(status)}
                  className={`px-4 py-2 rounded-full text-[10px] font-black border transition-all ${
                    selectedStatus === status
                      ? "bg-[#06054e] text-white border-[#06054e] shadow-md"
                      : "bg-white text-slate-500 border-slate-200 hover:border-[#06054e]"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Search */}
          <div className="flex flex-col gap-2 flex-1 min-w-[250px]">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">
              Search
            </span>
            <input
              type="text"
              placeholder="Search by team or umpire name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-4 py-2 rounded-full border-2 border-slate-200 text-sm focus:border-[#06054e] focus:ring-2 focus:ring-[#06054e] focus:ring-offset-0 outline-none"
            />
          </div>
        </div>

        {/* Active Filters Summary */}
        {(selectedDivision !== "All" ||
          selectedStatus !== "All" ||
          searchQuery) && (
          <div className="mt-4 pt-4 border-t-2 border-slate-200 flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-500">
              Active Filters:
            </span>

            {selectedDivision !== "All" && (
              <span className="px-3 py-1 bg-slate-100 rounded-full text-xs font-bold text-slate-700">
                {selectedDivision}
              </span>
            )}

            {selectedStatus !== "All" && (
              <span className="px-3 py-1 bg-slate-100 rounded-full text-xs font-bold text-slate-700">
                {selectedStatus}
              </span>
            )}

            {searchQuery && (
              <span className="px-3 py-1 bg-slate-100 rounded-full text-xs font-bold text-slate-700">
                &quot;{searchQuery}&quot;
              </span>
            )}

            <button
              onClick={() => {
                setSelectedDivision("All");
                setSelectedStatus("All");
                setSearchQuery("");
              }}
              className="px-3 py-1 text-xs font-bold text-red-600 hover:underline"
            >
              Clear All
            </button>
          </div>
        )}
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-slate-600">
          {filteredAllocations.length}{" "}
          {filteredAllocations.length === 1 ? "allocation" : "allocations"}{" "}
          found
        </p>
      </div>

      {/* Allocations Grid */}
      {filteredAllocations.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 shadow-lg text-center">
          <div className="max-w-md mx-auto">
            <p className="text-sm font-bold text-slate-400 uppercase tracking-wide mb-2">
              No Allocations Found
            </p>
            <p className="text-xs text-slate-500">
              {selectedDivision !== "All" ||
              selectedStatus !== "All" ||
              searchQuery
                ? "Try adjusting your filters to see more results."
                : "No umpire allocations available yet."}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredAllocations.map((allocation) => (
            <UmpireAllocationCard
              key={allocation.matchId}
              allocation={allocation}
            />
          ))}
        </div>
      )}
    </div>
  );
}
