"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import MatchList from "./MatchList";
import MatchFilters from "./MatchFilters";
import { EmptyStates } from "../shared/EmptyState";
import type { Match } from "@/types";

interface MatchListWrapperProps {
  initialMatches: Match[];
  divisions: string[];
  rounds: string[];
  viewType?: "results" | "upcoming" | "all";
}

/**
 * MatchListWrapper Component
 *
 * Client-side wrapper for match list with filtering functionality.
 * Manages filter state and provides interactive filtering UI.
 *
 * @example
 * <MatchListWrapper
 *   initialMatches={matches}
 *   divisions={['All', 'BHL1', 'BHL2']}
 *   rounds={['All', '1', '2', '3']}
 *   viewType="results"
 * />
 */
export default function MatchListWrapper({
  initialMatches,
  divisions,
  rounds,
  viewType = "all",
}: MatchListWrapperProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get current filters from URL
  const selectedDiv = searchParams.get("div") || "All";
  const selectedRound = searchParams.get("round") || "All";
  const selectedStatus = searchParams.get("status") || "All";

  // Filter matches based on current selections
  const filteredMatches = initialMatches.filter((match) => {
    // Filter by division
    if (selectedDiv !== "All" && match.division !== selectedDiv) {
      return false;
    }

    // Filter by round
    if (selectedRound !== "All" && match.round.toString() !== selectedRound) {
      return false;
    }

    // Filter by status
    if (selectedStatus !== "All" && match.status !== selectedStatus) {
      return false;
    }

    return true;
  });

  // Update URL when filter changes
  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());

    if (value === "All") {
      params.delete(key);
    } else {
      params.set(key, value);
    }

    router.push(`?${params.toString()}`);
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <MatchFilters
        divisions={divisions}
        rounds={rounds}
        selectedDiv={selectedDiv}
        selectedRound={selectedRound}
        selectedStatus={selectedStatus}
        onDivisionChange={(div) => updateFilter("div", div)}
        onRoundChange={(round) => updateFilter("round", round)}
        onStatusChange={(status) => updateFilter("status", status)}
      />

      {/* Match List */}
      {filteredMatches.length === 0 ? (
        viewType === "upcoming" ? (
          <EmptyStates.NoUpcoming />
        ) : viewType === "results" ? (
          <EmptyStates.NoResults />
        ) : (
          <EmptyStates.NoMatches />
        )
      ) : (
        <MatchList matches={filteredMatches} />
      )}
    </div>
  );
}
