import Link from "next/link";
import PageHeader from "@/components/shared/PageHeader";
import SpoilerFreeMatchList from "@/components/matches/SpoilerFreeMatchList";
import StandingsTable from "@/components/standings/StandingsTable";
import MatchDayFilters from "@/components/competitions/MatchDayFilters";
import { getSession } from "@/lib/auth/session";
import { getMyTeamIdsForSession } from "@/lib/data/myFixtures";
import { filterMatches, getSeasonCompetitionOptions, getRoundsForSeasonCompetition } from "@/lib/data";
import { loadFixturesMeta, type FixtureMeta } from "@/lib/data/publicFixtureMeta";
import { defaultYear, resolveRound, selectMatches } from "@/lib/competitions/fixtureView";
import type { Match } from "@/types";
import { getLiveStandingsDivision } from "@/lib/data/liveStandings";

export const dynamic = "force-dynamic";

export default async function ThisRoundPage({
  searchParams,
}: {
  searchParams: Promise<{ seasonCompetitionId?: string; year?: string; round?: string; mode?: string; clubId?: string; teamId?: string; my?: string; spoiler?: string }>;
}) {
  const params = await searchParams;
  const options = await getSeasonCompetitionOptions();
  const years = [...new Set(options.map((o) => o.season))].sort().reverse();
  const now = new Date();

  const requested = options.find((o) => o.seasonCompetitionId === params.seasonCompetitionId);
  const year = requested?.season ?? (params.year && years.includes(params.year) ? params.year : defaultYear(years, now));
  const divisions = options.map((o) => ({ id: o.seasonCompetitionId, season: o.season, name: o.competitionName ?? o.label }));
  const inYear = divisions.filter((d) => d.season === year).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  const selected = requested ?? options.find((o) => o.seasonCompetitionId === inYear[0]?.id);
  const scId = selected?.seasonCompetitionId ?? "";
  // Older links used mode=week|round.
  const roundChoice = params.round ?? (params.mode === "week" ? "week" : "next");

  const session = await getSession();
  const myOnly = params.my === "1";
  const clubId = (params.clubId ?? "").trim();
  const teamId = (params.teamId ?? "").trim();
  const myTeamIds = session ? await getMyTeamIdsForSession({ userId: session.userId, memberId: session.memberId ?? null, scopedRoles: session.scopedRoles ?? [] }) : [];

  const [rounds, meta, standings, allMatches] = scId
    ? await Promise.all([getRoundsForSeasonCompetition(scId), loadFixturesMeta(scId), getLiveStandingsDivision(scId), filterMatches({ seasonCompetitionId: scId }) as unknown as Promise<Match[]>])
    : [["All"], { fixtures: [] as FixtureMeta[], clubLabelById: new Map<string, string>(), teamLabelById: new Map<string, string>() }, null, [] as Match[]];

  const { fixtures, clubLabelById, teamLabelById } = meta;
  const clubs = [...new Set(fixtures.flatMap((f) => [f.homeClubId, f.awayClubId]).filter((x): x is string => Boolean(x)))]
    .map((id) => ({ id, label: clubLabelById.get(id) ?? id })).sort((a, b) => a.label.localeCompare(b.label));
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
  const matches = selectMatches(scoped, resolved);

  const heading =
    resolved.kind === "all" ? "All rounds" : resolved.kind === "week" ? "This week" : `Round ${resolved.round}${roundChoice === "next" ? " (next round)" : ""}`;
  const exportQs = (round: string, extra: Record<string, string> = {}) =>
    new URLSearchParams({ seasonCompetitionId: scId, round, ...(clubId ? { clubId } : {}), ...(teamId ? { teamId } : {}), ...(myOnly ? { my: "1" } : {}), ...extra }).toString();
  const dl = "rounded-full bg-white px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-700 shadow-lg hover:bg-slate-100";

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#06054e] via-slate-900 to-slate-800 px-4 pb-12 md:px-8 lg:px-12">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/competitions" className="group flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white">
          <span className="transition-transform group-hover:-translate-x-1">←</span> Back to Dashboard
        </Link>
      </div>

      <PageHeader title="Match Day" highlight="Central" />

      <div className="mt-6 space-y-4">
        <MatchDayFilters
          years={years} year={year} divisions={divisions} divisionId={scId}
          rounds={rounds.filter((r) => r !== "All")} round={roundChoice}
          clubs={clubs} clubId={clubId} teams={teams} teamId={teamId} my={myOnly} canMy={myTeamIds.length > 0}
          myClubId={session?.clubId ? String(session.clubId) : null}
        />

        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm font-bold text-white/80">
            {selected?.competitionName ?? selected?.label ?? ""} · {year} · <span className="text-white">{heading}</span>
            {clubId ? ` · ${clubLabelById.get(clubId) ?? ""}` : ""}
          </p>
          <div className="flex flex-wrap gap-2 sm:ml-auto">
            {scId && <a className={dl} href={`/api/public/competitions/fixtures-export?${exportQs(roundChoice)}`}>Download this view (.xlsx)</a>}
            {scId && roundChoice !== "all" && <a className={dl} href={`/api/public/competitions/fixtures-export?${exportQs("all")}`}>Download whole season</a>}
            {scId && clubId && <a className={dl} href={`/api/public/competitions/fixtures-export?${new URLSearchParams({ season: year, round: "all", clubId }).toString()}`}>{clubLabelById.get(clubId) ?? "Club"}: all divisions {year}</a>}
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(320px,400px)]">
        <div className="min-w-0">
          {matches.length > 0 ? (
            <SpoilerFreeMatchList matches={matches} isUpcoming={resolved.kind !== "round" || roundChoice === "next"} defaultSpoilerFree={params.spoiler === "1"} />
          ) : (
            <div className="rounded-3xl bg-white p-8 text-center text-slate-500">
              <p className="text-sm">No fixtures found for these filters.</p>
              <p className="mt-2 text-xs">Try All rounds, or clear the club filter.</p>
            </div>
          )}
        </div>
        <aside className="min-w-0 overflow-x-auto lg:sticky lg:top-4">
          <StandingsTable division={standings} selectedDiv={selected?.competitionName ?? selected?.label ?? "Standings"} availableYears={year ? [year] : []} currentYear={year} showYearFilter={false} />
        </aside>
      </div>
    </div>
  );
}
