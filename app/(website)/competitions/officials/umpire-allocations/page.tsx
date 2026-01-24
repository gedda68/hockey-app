import {
  getUmpireAllocations,
  getUmpireList,
} from "../../../../../lib/data/umpires";
import { getMatches } from "../../../../../lib/data/matches";
import BackButton from "../../../../../components/layout/BackButton";
import UmpireAllocationsList from "../../../../../components/umpires/UmpireAllocationsList";
import type { Metadata } from "next";

/**
 * Narrow local types (move to shared types if reused).
 */
type Umpire = {
  umpireId?: string;
  umpireNumber?: string;
  isActive?: boolean;
  [k: string]: unknown;
};

type MatchItem = {
  matchId?: string;
  dateTime?: string;
  status?: string;
  [k: string]: unknown;
};

type Allocation = {
  matchId?: string;
  umpires?: Array<{ umpireId?: string; umpireNumber?: string }>;
  [k: string]: unknown;
};

export const metadata: Metadata = {
  title: "Umpire Allocations | Brisbane Hockey League",
  description: "View umpire allocations for all matches",
};

export default async function UmpireAllocationsPage() {
  const [allocations, umpires, matches] = await Promise.all([
    getUmpireAllocations(),
    getUmpireList(),
    getMatches(),
  ]);

  const allocationsArray = Array.isArray(allocations)
    ? (allocations as Allocation[])
    : [];
  const umpiresArray = Array.isArray(umpires) ? (umpires as Umpire[]) : [];
  const matchesArray = Array.isArray(matches) ? (matches as MatchItem[]) : [];

  const umpireMap: Record<string, Umpire | undefined> = {};
  umpiresArray.forEach((u) => {
    if (u && u.umpireId) {
      umpireMap[String(u.umpireId)] = u;
    }
  });

  const matchMap: Record<string, MatchItem | undefined> = {};
  matchesArray.forEach((m) => {
    if (m && m.matchId) {
      matchMap[String(m.matchId)] = m;
    }
  });

  const enrichedAllocations = allocationsArray
    .map((allocation) => {
      if (!allocation || !allocation.matchId) {
        console.log("Invalid allocation:", allocation);
        return null;
      }

      const match = matchMap[String(allocation.matchId)];
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
          return umpireMap[String(u.umpireId)];
        })
        .filter(Boolean);

      return {
        matchId: allocation.matchId,
        umpires: umpiresList,
        match,
        assignedUmpires,
      };
    })
    .filter(Boolean)
    .sort((a: any, b: any) => {
      try {
        const dateA = new Date(a.match.dateTime).getTime();
        const dateB = new Date(b.match.dateTime).getTime();
        return dateB - dateA;
      } catch {
        return 0;
      }
    });

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-12">
      <BackButton href="/officials" label="Back to Officials" />

      <div className="mt-6 mb-8">
        <h1 className="text-4xl font-black uppercase italic text-[#06054e] mb-2">
          Umpire Allocations
        </h1>
        <p className="text-sm font-bold text-slate-600">
          View umpire assignments for all matches
        </p>
      </div>

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

      <UmpireAllocationsList allocations={enrichedAllocations} />
    </div>
  );
}
