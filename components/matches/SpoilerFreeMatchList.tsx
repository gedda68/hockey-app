"use client";

import { useMemo, useState } from "react";
import type { Match, MatchStats, UmpireDetails } from "@/types";
import MatchList from "@/components/matches/MatchList";

export default function SpoilerFreeMatchList({
  matches,
  isUpcoming,
  defaultSpoilerFree = false,
  stats,
  umpireAllocations,
  umpireList,
  showDivision,
}: {
  matches: Match[];
  isUpcoming: boolean;
  defaultSpoilerFree?: boolean;
  stats?: Record<string, MatchStats | null | undefined>;
  umpireAllocations?: Record<string, unknown>;
  umpireList?: UmpireDetails[];
  showDivision?: boolean;
}) {
  const hasResults = useMemo(
    () =>
      matches.some(
        (m) => m.status === "Final" || m.status === "Final (SO)" || m.status === "Live",
      ),
    [matches],
  );

  const [spoilerFree, setSpoilerFree] = useState<boolean>(
    defaultSpoilerFree && hasResults,
  );

  return (
    <div>
      {hasResults ? (
        <div className="mb-3 flex items-center justify-end">
          <button
            type="button"
            onClick={() => setSpoilerFree((s) => !s)}
            className="rounded-full bg-white px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-700 shadow-lg hover:bg-slate-100"
          >
            {spoilerFree ? "Reveal scores" : "Hide scores"}
          </button>
        </div>
      ) : null}

      <MatchList matches={matches} isUpcoming={isUpcoming} spoilerFree={spoilerFree} stats={stats} umpireAllocations={umpireAllocations} umpireList={umpireList} showDivision={showDivision} />
    </div>
  );
}

