import {
  getUmpireAllocations,
  getUmpireList,
} from "../../../../../lib/data/umpires";
import { getMatches } from "../../../../../lib/data/matches";
import BackButton from "../../../../../components/layout/BackButton";
import UmpireAllocationsList from "../../../../../components/umpires/UmpireAllocationsList";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Umpire Allocations | Brisbane Hockey League",
  description: "View umpire allocations for all matches",
};

export default async function UmpireAllocationsPage() {
  // Fetch data in parallel
  const [allocations, umpires, matches] = await Promise.all([
    getUmpireAllocations(),
    getUmpireList(),
    getMatches(),
  ]);

  console.log("Allocations:", allocations.length);
  console.log("Umpires:", umpires.length);
  console.log("Matches:", matches.length);

  // Ensure we have arrays
  const allocationsArray = Array.isArray(allocations) ? allocations : [];
  const umpiresArray = Array.isArray(umpires) ? umpires : [];
  const matchesArray = Array.isArray(matches) ? matches : [];

  // Create lookup objects (use plain objects instead of Map for better debugging)
  const umpireMap: Record<string, any> = {};
  umpiresArray.forEach((u) => {
    if (u && u.umpireNumber) {
      umpireMap[u.umpireNumber] = u;
    }
  });

  const matchMap: Record<string, any> = {};
  matchesArray.forEach((m) => {
    if (m && m.matchId) {
      matchMap[m.matchId] = m;
    }
  });

  console.log("UmpireMap keys:", Object.keys(umpireMap).length);
  console.log("MatchMap keys:", Object.keys(matchMap).length);

  // Enrich allocations with umpire and match details
  const enrichedAllocations = allocationsArray
    .map((allocation) => {
      if (!allocation || !allocation.matchId) {
        console.log("Invalid allocation:", allocation);
        return null;
      }

      const match = matchMap[allocation.matchId];
      if (!match) {
        console.log("No match found for ID:", allocation.matchId);
        return null;
      }

      const umpiresList = Array.isArray(allocation.umpires)
        ? allocation.umpires
        : [];
      const assignedUmpires = umpiresList
        .map((u) => {
          if (!u || !u.umpireId) return null;
          return umpireMap[u.umpireId];
        })
        .filter(Boolean);

      return {
        matchId: allocation.matchId,
        umpires: umpiresList,
        match: match,
        assignedUmpires: assignedUmpires,
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      // Sort by date (most recent first)
      try {
        const dateA = new Date(a.match.dateTime).getTime();
        const dateB = new Date(b.match.dateTime).getTime();
        return dateB - dateA;
      } catch (e) {
        return 0;
      }
    });

  console.log("Enriched allocations:", enrichedAllocations.length);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-12">
      {/* Back Button */}
      <BackButton href="/officials" label="Back to Officials" />

      {/* Page Header */}
      <div className="mt-6 mb-8">
        <h1 className="text-4xl font-black uppercase italic text-[#06054e] mb-2">
          Umpire Allocations
        </h1>
        <p className="text-sm font-bold text-slate-600">
          View umpire assignments for all matches
        </p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-3xl p-6 shadow-lg">
          <div className="text-4xl font-black text-[#06054e] mb-1">
            {enrichedAllocations.length}
          </div>
          <div className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">
            Total Allocations
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-lg">
          <div className="text-4xl font-black text-[#06054e] mb-1">
            {umpiresArray.filter((u) => u.isActive).length}
          </div>
          <div className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">
            Active Umpires
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-lg">
          <div className="text-4xl font-black text-[#06054e] mb-1">
            {matchesArray.filter((m) => m.status === "Scheduled").length}
          </div>
          <div className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">
            Upcoming Matches
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-lg">
          <div className="text-4xl font-black text-[#06054e] mb-1">
            {matchesArray.filter((m) => m.status === "Final").length}
          </div>
          <div className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">
            Completed Matches
          </div>
        </div>
      </div>

      {/* Debug Info (remove after testing) */}
      {enrichedAllocations.length === 0 && (
        <div className="bg-yellow-50 border-2 border-yellow-400 rounded-3xl p-6 mb-6">
          <h3 className="text-lg font-black text-yellow-800 mb-2">
            Debug Info
          </h3>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>Allocations loaded: {allocationsArray.length}</li>
            <li>Umpires loaded: {umpiresArray.length}</li>
            <li>Matches loaded: {matchesArray.length}</li>
            <li>Enriched allocations: {enrichedAllocations.length}</li>
          </ul>
        </div>
      )}

      {/* Allocations List */}
      <UmpireAllocationsList allocations={enrichedAllocations} />
    </div>
  );
}
