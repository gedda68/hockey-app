"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import MatchList from "./MatchList";
import { EmptyStates } from "../shared/EmptyState";
import { filterButtonVariants } from "../shared/FilterButton";
import { cn } from "@/lib/utils";
import type { Match } from "@/types";

interface MatchListWrapperProps {
  initialMatches: Match[];
  divisions: string[];
  rounds: string[];
  /** Defaults to common match statuses when omitted */
  statuses?: string[];
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
const DEFAULT_STATUSES = ["All", "Live", "Final", "Scheduled"];

export default function MatchListWrapper({
  initialMatches,
  divisions,
  rounds,
  statuses = DEFAULT_STATUSES,
  viewType = "all",
}: MatchListWrapperProps) {
  const pathname = usePathname() ?? "/";
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

  const buildHref = (patch: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (value === "All") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    const q = params.toString();
    return q ? `${pathname}?${q}` : pathname;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-x-12 gap-y-6">
        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">
            Division
          </span>
          <div className="flex gap-2 flex-wrap">
            {divisions.map((div) => (
              <Link
                key={div}
                href={buildHref({ div })}
                className={cn(
                  filterButtonVariants({
                    variant: "primary",
                    isActive: selectedDiv === div,
                  }),
                )}
              >
                {div}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">
            Round
          </span>
          <div className="flex gap-2 flex-wrap">
            {rounds.map((round) => (
              <Link
                key={round}
                href={buildHref({ round })}
                className={cn(
                  filterButtonVariants({
                    variant: "secondary",
                    isActive: selectedRound === round,
                  }),
                )}
              >
                {round}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">
            Status
          </span>
          <div className="flex gap-2 flex-wrap">
            {statuses.map((stat) => (
              <Link
                key={stat}
                href={buildHref({ status: stat })}
                className={cn(
                  filterButtonVariants({
                    variant: "status",
                    isActive: selectedStatus === stat,
                  }),
                )}
              >
                {stat}
              </Link>
            ))}
          </div>
        </div>
      </div>

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
