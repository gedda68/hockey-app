import React from "react";
import Link from "next/link";
import MatchList from "../../../../components/matches/MatchList";
import MatchDayFilters from "../../../../components/competitions/MatchDayFilters";
import { loadFixturesMeta, type FixtureMeta } from "../../../../lib/data/publicFixtureMeta";
import { defaultYear } from "../../../../lib/competitions/fixtureView";
import PageHeader from "../../../../components/shared/PageHeader";
import StandingsTable from "../../../../components/standings/StandingsTable";
import MyFixturesStrip from "../../../../components/matches/MyFixturesStrip";
import type { ViewType } from "../../../../types";

// Import data utility functions
import {
  filterMatches,
  getSeasonCompetitionOptions,
  getRoundsForSeasonCompetition,
  getMatchStatsData,
  getUmpireDetailsList,
  resolveUmpireAllocationsForMatches,
} from "../../../../lib/data";

import { getLiveStandingsDivision } from "../../../../lib/data/liveStandings";

export const dynamic = "force-dynamic";

export default async function MatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ seasonCompetitionId?: string; year?: string; round?: string; status?: string; view?: string; clubId?: string; teamId?: string }>;
}) {
  const params = await searchParams;
  const selectedView: ViewType = (params.view as ViewType) || "results";
  const selectedStatus = params.status || "All";
  const roundChoice = (params.round || "all").trim();
  const now = new Date();

  const [options, statsData, umpireList] = await Promise.all([getSeasonCompetitionOptions(), getMatchStatsData(), getUmpireDetailsList()]);
  const years = [...new Set(options.map((o) => o.season))].sort().reverse();
  const requested = options.find((o) => o.seasonCompetitionId === params.seasonCompetitionId);
  const year = requested?.season ?? (params.year && years.includes(params.year) ? params.year : defaultYear(years, now));
  const divisions = options.map((o) => ({ id: o.seasonCompetitionId, season: o.season, name: o.competitionName ?? o.label }));
  const inYear = divisions.filter((d) => d.season === year).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  const selectedMeta = requested ?? options.find((o) => o.seasonCompetitionId === inYear[0]?.id);
  const scId = selectedMeta?.seasonCompetitionId ?? "";

  const meta = scId ? await loadFixturesMeta(scId) : { fixtures: [] as FixtureMeta[], clubLabelById: new Map<string, string>(), teamLabelById: new Map<string, string>() };
  const { fixtures, clubLabelById, teamLabelById } = meta;
  const teamId = (params.teamId ?? "").trim();
  // A link that names only a team still shows that team's club.
  const clubId = (params.clubId ?? "").trim() || (teamId ? (fixtures.find((f) => f.homeTeamId === teamId)?.homeClubId ?? fixtures.find((f) => f.awayTeamId === teamId)?.awayClubId ?? "") : "");
  const clubs = [...new Set(fixtures.flatMap((f) => [f.homeClubId, f.awayClubId]).filter((x): x is string => Boolean(x)))]
    .map((id) => ({ id, label: clubLabelById.get(id) ?? id })).sort((a, b) => a.label.localeCompare(b.label));
  const teams = clubId
    ? [...new Set(fixtures.flatMap((f) => [f.homeClubId === clubId ? f.homeTeamId : undefined, f.awayClubId === clubId ? f.awayTeamId : undefined]).filter((x): x is string => Boolean(x)))]
        .map((id) => ({ id, label: teamLabelById.get(id) ?? id })).sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }))
    : [];

  const [rounds, found, currentStandings] = scId
    ? await Promise.all([
        getRoundsForSeasonCompetition(scId),
        filterMatches({ view: selectedView, seasonCompetitionId: scId, round: roundChoice === "all" ? "All" : roundChoice, status: selectedStatus, teamId: teamId || undefined }),
        getLiveStandingsDivision(scId),
      ])
    : [["All"], [], null];
  const allowed = new Set(fixtures.filter((f) => (teamId ? f.homeTeamId === teamId || f.awayTeamId === teamId : clubId ? f.homeClubId === clubId || f.awayClubId === clubId : true)).map((f) => f.match.matchId));
  const filteredMatchesFinal = clubId || teamId ? found.filter((m) => allowed.has(m.matchId)) : found;
  const umpireAllocations = await resolveUmpireAllocationsForMatches(filteredMatchesFinal);

  const statusOptions = (selectedView === "upcoming" ? ["All", "Scheduled"] : ["All", "Live", "Final"]).map((v) => ({ value: v, label: v === "All" ? "All statuses" : v }));
  const tab = (view: "results" | "upcoming") => `/competitions/matches?${new URLSearchParams({ view, ...(scId ? { seasonCompetitionId: scId } : {}), ...(clubId ? { clubId } : {}), ...(teamId ? { teamId } : {}) }).toString()}`;
  const viewToggle = (
    <>
      <Link href={tab("results")} className={`rounded-full px-6 py-2 text-[10px] font-black uppercase tracking-widest shadow-lg transition-all ${selectedView === "results" ? "bg-red-600 text-white" : "bg-white text-slate-600 hover:bg-slate-100"}`}>Results</Link>
      <Link href={tab("upcoming")} className={`rounded-full px-6 py-2 text-[10px] font-black uppercase tracking-widest shadow-lg transition-all ${selectedView === "upcoming" ? "bg-red-600 text-white" : "bg-white text-slate-600 hover:bg-slate-100"}`}>Fixtures</Link>
    </>
  );

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#06054e] via-slate-900 to-slate-800 px-4 pb-12 md:px-8 lg:px-12">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/competitions" className="group flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white">
          <span className="transition-transform group-hover:-translate-x-1">←</span> Back to Dashboard
        </Link>
      </div>

      <PageHeader title={selectedView === "upcoming" ? "Upcoming" : "Match"} highlight={selectedView === "upcoming" ? "Fixtures" : "Results"} actions={viewToggle} />
      <MyFixturesStrip title="My fixtures" />

      <div className="mt-6">
        <MatchDayFilters
          basePath="/competitions/matches" roundMode="results" fixed={{ view: selectedView }}
          years={years} year={year} divisions={divisions} divisionId={scId}
          rounds={rounds.filter((r) => r !== "All")} round={roundChoice} currentRound={/^\d+$/.test(roundChoice) ? roundChoice : null}
          clubs={clubs} clubId={clubId} teams={teams} teamId={teamId} my={false} canMy={false} myClubId={null}
          status={{ value: selectedStatus, options: statusOptions }}
        />
      </div>

      {scId && (
        <div className="mt-4 flex flex-wrap gap-2">
          {[["Download this view (.xlsx)", roundChoice, true], ["Download whole season", "all", roundChoice !== "all"]].map(([label, round, show]) => show ? (
            <a key={String(label)} className="rounded-full bg-white px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-700 shadow-lg hover:bg-slate-100"
              href={`/api/public/competitions/fixtures-export?${new URLSearchParams({ seasonCompetitionId: scId, round: String(round), view: selectedView, ...(selectedStatus !== "All" && label !== "Download whole season" ? { status: selectedStatus } : {}), ...(clubId ? { clubId } : {}), ...(teamId ? { teamId } : {}) }).toString()}`}>{label}</a>
          ) : null)}
          {clubId && <a className="rounded-full bg-white px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-700 shadow-lg hover:bg-slate-100"
            href={`/api/public/competitions/fixtures-export?${new URLSearchParams({ season: year, round: "all", view: selectedView, clubId }).toString()}`}>{clubLabelById.get(clubId) ?? "Club"}: all divisions {year}</a>}
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(320px,400px)]">
        <div className="min-w-0">
          {filteredMatchesFinal.length > 0 ? (
            <MatchList matches={filteredMatchesFinal} stats={selectedView === "results" ? statsData : {}} isUpcoming={selectedView === "upcoming"} umpireAllocations={umpireAllocations} umpireList={umpireList} />
          ) : (
            <div className="rounded-3xl bg-white p-8 text-center text-slate-500">
              <p className="text-sm">{selectedView === "upcoming" ? "No upcoming fixtures match these filters." : "No match results match these filters."}</p>
              <p className="mt-2 text-xs">Try All rounds or All statuses, or clear the club filter.</p>
            </div>
          )}
        </div>
        <aside className="min-w-0 overflow-x-auto lg:sticky lg:top-4">
          <StandingsTable division={currentStandings} selectedDiv={selectedMeta?.competitionName ?? selectedMeta?.label ?? "Standings"} availableYears={year ? [year] : []} currentYear={year} showYearFilter={false} />
        </aside>
      </div>
    </div>
  );
}
