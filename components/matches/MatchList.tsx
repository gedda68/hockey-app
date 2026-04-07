"use client";

import { useState } from "react";
import MatchCard from "./MatchCard";
import MatchModal from "./MatchModal";
import type { Match, MatchStats, UmpireDetails } from "../../types";

interface MatchListProps {
  matches: Match[];
  /** Per-match stats for the detail modal; omit when not loaded */
  stats?: Record<string, MatchStats | null | undefined>;
  isUpcoming?: boolean;
  /** Match id → allocation doc (shape varies by data source) */
  umpireAllocations?: Record<string, unknown>;
  umpireList?: UmpireDetails[];
}

export default function MatchList({
  matches,
  stats = {},
  isUpcoming = false,
  umpireAllocations = {},
  umpireList = [],
}: MatchListProps) {
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);

  // Helper function to get umpire details
  const getUmpireDetails = (umpireId: string) => {
    return umpireList.find((u) => u.umpireNumber === umpireId);
  };

  // Helper function to get allocated umpires for a match
  const getMatchUmpires = (matchId: string) => {
    const allocation = umpireAllocations[matchId] as
      | { umpires?: { umpireId: string; umpireType?: string; role?: string }[] }
      | undefined;
    if (!allocation?.umpires) return null;

    const primaryUmpires = allocation.umpires
      .filter(
        (u) => u.umpireType === "primary" || u.role === "primary",
      )
      .map((u) => getUmpireDetails(u.umpireId))
      .filter((u): u is UmpireDetails => u != null);

    return primaryUmpires.length > 0 ? primaryUmpires : null;
  };

  if (!matches || matches.length === 0) {
    return (
      <div className="bg-white rounded-[40px] p-20 text-center border-4 border-dashed border-slate-200">
        <p className="text-slate-400 font-black uppercase italic tracking-widest">
          No matches found for the selected filters
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {matches.map((match) => {
        const umpires = getMatchUmpires(match.matchId);

        return (
          <MatchCard
            key={match.matchId}
            match={match}
            isUpcoming={isUpcoming}
            umpires={umpires}
            onClick={() => setSelectedMatch(match)}
          />
        );
      })}

      {/* MATCH MODAL */}
      {selectedMatch && (
        <MatchModal
          match={selectedMatch}
          matchStats={stats[selectedMatch.matchId] ?? null}
          onClose={() => setSelectedMatch(null)}
          isUpcoming={isUpcoming}
          umpires={getMatchUmpires(selectedMatch.matchId)}
        />
      )}
    </div>
  );
}
