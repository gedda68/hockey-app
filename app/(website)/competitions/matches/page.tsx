import Link from "next/link";
import PageHeader from "@/components/shared/PageHeader";
import SpoilerFreeMatchList from "@/components/matches/SpoilerFreeMatchList";
import MyFixturesStrip from "@/components/matches/MyFixturesStrip";
import StandingsTable from "@/components/standings/StandingsTable";
import MatchDayFilters from "@/components/competitions/MatchDayFilters";
import { getSession } from "@/lib/auth/session";
import { getMyTeamIdsForSession } from "@/lib/data/myFixtures";
import { filterMatches, getSeasonCompetitionOptions, getRoundsForSeasonCompetition, getMatchStatsData, getUmpireDetailsList, resolveUmpireAllocationsForMatches } from "@/lib/data";
import { loadFixturesMeta, loadByes, type FixtureMeta } from "@/lib/data/publicFixtureMeta";
import { defaultYear, resolveRound, selectMatches } from "@/lib/competitions/fixtureView";
import { getLiveStandingsDivision } from "@/lib/data/liveStandings";
import type { Match } from "@/types";
import type { ByeItem } from "@/components/matches/ByeRow";

export const dynamic = "force-dynamic";

type Status = "all" | "fixtures" | "results";
/** Understands the old status / view values from earlier links. */
function readStatus(status?: string, view?: string): Status {
  const s = (status ?? "").toLowerCase();
  if (["fixtures", "scheduled", "upcoming"].includes(s)) return "fixtures";
  if (["results", "final", "live"].includes(s)) return "results";
  if (s === "all" || s === "") return view === "results" ? "results" : view === "upcoming" ? "fixtures" : "all";
  return "all";
}
const isResult = (m: Match) => String(m.status).startsWith("Final") || m.status === "Live";

export default async function MatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ seasonCompetitionId?: string; year?: string; round?: string; mode?: string; status?: string; view?: string; clubId?: string; teamId?: string; my?: string; spoiler?: string }>;
}) {
  const params = await searchParams;
  const now = new Date();
  const status = readStatus(params.status, params.view);
  const rawRound = (params.round ?? (params.mode === "week" ? "week" : "next")).trim() || "next";
  const roundChoice = ["next", "week", "all"].includes(rawRound.toLowerCase()) ? rawRound.toLowerCase() : rawRound;
  const myOnly = params.my === "1";

  const [options, statsData, umpireList, session] = await Promise.all([getSeasonCompetitionOptions(), getMatchStatsData(), getUmpireDetailsList(), getSession()]);
  const years = [...new Set(options.map((o) => o.season))].sort().reverse();
  const allDivisions = params.seasonCompetitionId === "all";
  const requested = options.find((o) => o.seasonCompetitionId === params.seasonCompetitionId);
  const year = requested?.season ?? (params.year && years.includes(params.year) ? params.year : defaultYear(years, now));
  const divisions = options.map((o) => ({ id: o.seasonCompetitionId, season: o.season, name: o.competitionName ?? o.label }));
  const inYear = divisions.filter((d) => d.season === year).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  const single = allDivisions ? null : requested ?? options.find((o) => o.seasonCompetitionId === inYear[0]?.id) ?? null;
  const scIds = allDivisions ? inYear.map((d) => d.id) : single ? [single.seasonCompetitionId] : [];
  const divisionId = allDivisions ? "all" : single?.seasonCompetitionId ?? "";

  const [metas, matchSets, roundSets, byeSets] = await Promise.all([
    Promise.all(scIds.map((id) => loadFixturesMeta(id))),
    Promise.all(scIds.map((id) => filterMatches({ seasonCompetitionId: id }) as unknown as Promise<Match[]>)),
    Promise.all(scIds.map((id) => getRoundsForSeasonCompetition(id))),
    Promise.all(scIds.map((id) => loadByes(id))),
  ]);
  const fixtures: FixtureMeta[] = metas.flatMap((m) => m.fixtures);
  const clubLabelById = new Map<string, string>(), teamLabelById = new Map<string, string>();
  for (const m of metas) { m.clubLabelById.forEach((v, k) => clubLabelById.set(k, v)); m.teamLabelById.forEach((v, k) => teamLabelById.set(k, v)); }
  const allMatches = matchSets.flat();
  const rounds = [...new Set(roundSets.flat().filter((r) => r !== "All"))].sort((a, b) => Number(a) - Number(b));

  const teamId = (params.teamId ?? "").trim();
  // A link that names only a team still shows that team's club.
  const rawClubId = (params.clubId ?? "").trim() || (teamId ? (fixtures.find((f) => f.homeTeamId === teamId)?.homeClubId ?? fixtures.find((f) => f.awayTeamId === teamId)?.awayClubId ?? "") : "");
  const myTeamIds = session ? await getMyTeamIdsForSession({ userId: session.userId, memberId: session.memberId ?? null, scopedRoles: session.scopedRoles ?? [] }) : [];

  const clubs = [...new Set(fixtures.flatMap((f) => [f.homeClubId, f.awayClubId]).filter((x): x is string => Boolean(x)))].map((id) => ({ id, label: clubLabelById.get(id) ?? id })).sort((a, b) => a.label.localeCompare(b.label));
  // A club (or team) that isn't in this year / division is ignored rather than leaving an empty page.
  const clubId = clubs.some((c) => c.id === rawClubId) ? rawClubId : "";
  const teams = clubId
    ? [...new Set(fixtures.flatMap((f) => [f.homeClubId === clubId ? f.homeTeamId : undefined, f.awayClubId === clubId ? f.awayTeamId : undefined]).filter((x): x is string => Boolean(x)))]
        .map((id) => ({ id, label: teamLabelById.get(id) ?? id })).sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }))
    : [];

  const allowed = new Set(
    fixtures.filter((f) => {
      if (myOnly) return Boolean((f.homeTeamId && myTeamIds.includes(f.homeTeamId)) || (f.awayTeamId && myTeamIds.includes(f.awayTeamId)));
      if (teamId) return f.homeTeamId === teamId || f.awayTeamId === teamId;
      if (clubId) return f.homeClubId === clubId || f.awayClubId === clubId;
      return true;
    }).map((f) => f.match.matchId),
  );
  const scoped = allMatches.filter((m) => allowed.has(m.matchId));
  const resolved = resolveRound(roundChoice, scoped, now);
  const picked = selectMatches(scoped, resolved);
  const matches = status === "fixtures" ? picked.filter((m) => !isResult(m) && m.status === "Scheduled") : status === "results" ? picked.filter(isResult) : picked;
  // Odd-sized divisions: "Team v bye" for each team resting in a round that is on show (not on Results, which lists played matches).
  const byeItems: ByeItem[] = [];
  if (status !== "results") {
    scIds.forEach((id, i) => {
      const shown = new Set(selectMatches(matchSets[i], resolved).map((m) => Number(m.round)));
      const played = new Set(matchSets[i].map((m) => Number(m.round)));
      for (const [r, list] of Object.entries(byeSets[i])) {
        const round = Number(r);
        if (!played.has(round) || (resolved.kind !== "all" && !shown.has(round))) continue;
        for (const b of list) {
          const fx = fixtures.find((f) => f.homeTeamId === b.teamId || f.awayTeamId === b.teamId);
          const clubOfTeam = fx ? (fx.homeTeamId === b.teamId ? fx.homeClubId : fx.awayClubId) : undefined;
          if (myOnly ? !myTeamIds.includes(b.teamId) : teamId ? b.teamId !== teamId : clubId ? clubOfTeam !== clubId : false) continue;
          const sample = matchSets[i].find((m) => m.homeTeamId === b.teamId || m.awayTeamId === b.teamId);
          byeItems.push({ key: `bye-${id}-${round}-${b.teamId}`, round, division: divisions.find((d) => d.id === id)?.name, teamName: b.name, icon: sample ? (sample.homeTeamId === b.teamId ? sample.homeTeamIcon : sample.awayTeamIcon) : undefined });
        }
      }
    });
  }
  const umpireAllocations = await resolveUmpireAllocationsForMatches(matches);
  const standings = single ? await getLiveStandingsDivision(single.seasonCompetitionId) : null;

  const heading = resolved.kind === "all" ? "All rounds" : resolved.kind === "week" ? "This week" : `Round ${resolved.round}${roundChoice === "next" ? " (next round)" : ""}`;
  const divisionName = single ? single.competitionName ?? single.label : "All divisions";
  const view = status === "results" ? "results" : status === "fixtures" ? "upcoming" : "";
  const dlBase = (round: string, withClub = true) => new URLSearchParams({ ...(allDivisions ? { season: year } : { seasonCompetitionId: divisionId }), round, ...(view ? { view } : {}), ...(withClub && clubId ? { clubId } : {}), ...(withClub && teamId ? { teamId } : {}), ...(withClub && myOnly ? { my: "1" } : {}) }).toString();
  const dl = "rounded-full bg-white px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-700 shadow-lg hover:bg-slate-100";
  const showStandings = Boolean(single);

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#06054e] via-slate-900 to-slate-800 px-4 pb-12 md:px-8 lg:px-12">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/competitions" className="group flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white">
          <span className="transition-transform group-hover:-translate-x-1">←</span> Back to Dashboard
        </Link>
      </div>

      <PageHeader title="Match" highlight="Centre" />
      <MyFixturesStrip title="My fixtures" />

      <div className="mt-6 space-y-4">
        <MatchDayFilters
          years={years} year={year} divisions={divisions} divisionId={divisionId} rounds={rounds} round={roundChoice}
          clubs={clubs} clubId={clubId} teams={teams} teamId={teamId} my={myOnly} canMy={myTeamIds.length > 0}
          myClubId={session?.clubId ? String(session.clubId) : null} status={status}
        />
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm font-bold text-white/80">
            {divisionName} · {year} · <span className="text-white">{heading}</span>
            {clubId ? ` · ${clubLabelById.get(clubId) ?? ""}` : ""} · {matches.length} {matches.length === 1 ? "match" : "matches"}
          </p>
          <div className="flex flex-wrap gap-2 sm:ml-auto">
            {scIds.length > 0 && <a className={dl} href={`/api/public/competitions/fixtures-export?${dlBase(roundChoice)}`}>Download this view (.xlsx)</a>}
            {scIds.length > 0 && roundChoice !== "all" && <a className={dl} href={`/api/public/competitions/fixtures-export?${dlBase("all")}`}>Download all rounds</a>}
            {clubId && !allDivisions && <a className={dl} href={`/api/public/competitions/fixtures-export?${new URLSearchParams({ season: year, round: "all", clubId, ...(view ? { view } : {}) }).toString()}`}>{clubLabelById.get(clubId) ?? "Club"}: all divisions {year}</a>}
          </div>
        </div>
      </div>

      <div className={`mt-6 grid grid-cols-1 items-start gap-8 ${showStandings ? "lg:grid-cols-[minmax(0,1fr)_minmax(320px,400px)]" : ""}`}>
        <div className="min-w-0">
          {matches.length > 0 || byeItems.length > 0 ? (
            <SpoilerFreeMatchList matches={matches} isUpcoming={status !== "results"} defaultSpoilerFree={params.spoiler === "1"} stats={statsData} umpireAllocations={umpireAllocations} umpireList={umpireList} showDivision={allDivisions} byes={byeItems} />
          ) : (
            <div className="rounded-3xl bg-white p-8 text-center text-slate-500">
              <p className="text-sm">No matches found for these filters.</p>
              <p className="mt-2 text-xs">Try All rounds, All matches, or clear the club filter.</p>
            </div>
          )}
        </div>
        {showStandings && (
          <aside className="min-w-0 overflow-x-auto lg:sticky lg:top-4">
            <StandingsTable division={standings} selectedDiv={divisionName} availableYears={year ? [year] : []} currentYear={year} showYearFilter={false} />
          </aside>
        )}
      </div>
    </div>
  );
}

export const metadata = { title: "Match Centre | Fixtures & Results" };
