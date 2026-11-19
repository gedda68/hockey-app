import Link from "next/link";
import PageHeader from "@/components/shared/PageHeader";
import StatisticsCard from "@/components/statistics/StatisticsCard";
import StatsTable, { type StatsRowData } from "@/components/statistics/StatsTable";
import StatsFilters from "@/components/statistics/StatsFilters";
import clientPromise from "@/lib/mongodb";
import { listPublicLeagues } from "@/lib/public/publicLeagues";
import { defaultYear } from "@/lib/competitions/fixtureView";
import { loadMemberNames, loadStatsScope } from "@/lib/competitions/statsLoader";
import { computeStats } from "@/lib/competitions/statsOverview";

export const dynamic = "force-dynamic";
type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() ?? "";

export default async function StatisticsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const leagues = await listPublicLeagues();
  const years = [...new Set(leagues.map((l) => l.season))].sort((a, b) => b.localeCompare(a));
  const wantedDiv = one(sp.seasonCompetitionId);
  const divisionRow = leagues.find((l) => l.seasonCompetitionId === wantedDiv);
  // A chosen division carries its own year; otherwise ?year=, else the current or next year with competitions.
  const year = divisionRow?.season ?? (years.includes(one(sp.year)) ? one(sp.year) : defaultYear(years, new Date()));
  const divisions = leagues.map((l) => ({ id: l.seasonCompetitionId, season: l.season, name: l.competitionName ?? l.competitionId }));
  const divisionId = divisionRow ? divisionRow.seasonCompetitionId : "all";
  const scope = leagues.filter((l) => l.season === year && (divisionId === "all" || l.seasonCompetitionId === divisionId)).map((l) => l.seasonCompetitionId);
  const category = ["players", "teams", "discipline"].includes(one(sp.category)) ? one(sp.category) : "players";

  const client = await clientPromise;
  const db = client.db(process.env.DB_NAME || "hockey-app");
  const { fixtures, approvalBySc, clubByTeam, teamName, clubName, clubLogo } = await loadStatsScope(db, scope);

  // Club choices come from the fixtures in scope; a club or player that isn't there is ignored.
  const clubIds = [...new Set(fixtures.flatMap((f) => [clubByTeam.get(f.homeTeamId), clubByTeam.get(f.awayTeamId)]).filter((x): x is string => Boolean(x)))];
  const clubId = clubIds.includes(one(sp.clubId)) ? one(sp.clubId) : "";
  const base = computeStats(fixtures, clubByTeam, approvalBySc, { clubId });
  const names = await loadMemberNames(db, base.playerChoices.map((p) => p.memberId));
  const memberId = base.playerChoices.some((p) => p.memberId === one(sp.memberId)) ? one(sp.memberId) : "";
  const stats = memberId ? computeStats(fixtures, clubByTeam, approvalBySc, { clubId, memberId }) : base;
  const nameOf = (id: string) => names.get(id) ?? id;
  const club = (id: string) => clubName.get(id) ?? "";

  const clubs = clubIds.map((id) => ({ id, label: club(id) || id })).sort((a, b) => a.label.localeCompare(b.label));
  const players = base.playerChoices.map((p) => ({ id: p.memberId, label: nameOf(p.memberId) })).sort((a, b) => a.label.localeCompare(b.label));
  const { summary } = stats;

  const playerRows = (sorted: typeof stats.players, cells: (p: (typeof stats.players)[number]) => Record<string, string | number>): StatsRowData[] =>
    sorted.slice(0, 25).map((p) => ({ id: p.memberId, cells: { name: nameOf(p.memberId), ...cells(p) }, sub: club(p.clubId), icon: { src: clubLogo.get(p.clubId), alt: club(p.clubId) || nameOf(p.memberId) } }));
  const byName = (a: { memberId: string }, b: { memberId: string }) => nameOf(a.memberId).localeCompare(nameOf(b.memberId));
  const scorers = [...stats.players].filter((p) => p.goals > 0).sort((a, b) => b.goals - a.goals || a.matches - b.matches || byName(a, b));
  const assisters = [...stats.players].filter((p) => p.assists > 0).sort((a, b) => b.assists - a.assists || byName(a, b));
  const carded = [...stats.players].filter((p) => p.green + p.yellow + p.red > 0).sort((a, b) => b.red - a.red || b.yellow - a.yellow || b.green - a.green || byName(a, b));
  const teamRows: StatsRowData[] = stats.teams.map((t) => ({
    id: t.teamId, sub: club(clubByTeam.get(t.teamId) ?? ""), icon: { src: clubLogo.get(clubByTeam.get(t.teamId) ?? ""), alt: club(clubByTeam.get(t.teamId) ?? "") || (teamName.get(t.teamId) ?? "") },
    cells: { name: teamName.get(t.teamId) ?? t.teamId, p: t.played, w: t.wins, d: t.draws, l: t.losses, gf: t.gf, ga: t.ga, gd: t.gf - t.ga, cs: t.cleanSheets, avg: t.played ? (t.gf / t.played).toFixed(2) : "0.00" },
  }));

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#06054e] via-slate-900 to-slate-800 px-4 pb-16 md:px-8 lg:px-12">
      <div className="mb-8">
        <Link href="/competitions" className="group flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white">
          <span className="transition-transform group-hover:-translate-x-1">←</span> Back to Dashboard
        </Link>
      </div>

      <div className="mb-8 border-b-4 border-[#06054e] pb-6">
        <PageHeader title="Competition" highlight="Statistics" />
        <StatsFilters years={years.length ? years : [year]} year={year} divisions={divisions} divisionId={divisionId} clubs={clubs} clubId={clubId} players={players} memberId={memberId} category={category} />
      </div>

      <div className="space-y-8">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatisticsCard title="Total goals" value={summary.goals} subtitle={`${summary.matches} completed match${summary.matches === 1 ? "" : "es"}`} />
          <StatisticsCard title="Avg goals / match" value={summary.avgGoals.toFixed(2)} subtitle="Completed matches" />
          <StatisticsCard title="Clean sheets" value={summary.cleanSheets} subtitle="Shutouts" />
          <StatisticsCard title="Cards" value={summary.green + summary.yellow + summary.red} subtitle={`${summary.green} green · ${summary.yellow} yellow · ${summary.red} red`} />
        </div>

        {category === "players" && (
          <div className="space-y-6">
            <StatsTable title="Top scorers" columns={[{ key: "name", label: "Player", align: "left" }, { key: "m", label: "Games" }, { key: "fg", label: "Field" }, { key: "pc", label: "Pen. corner" }, { key: "ps", label: "Pen. stroke" }, { key: "g", label: "Total" }, { key: "avg", label: "Goals / game" }]} rows={playerRows(scorers, (p) => ({ m: p.matches, fg: p.fieldGoals, pc: p.corners, ps: p.strokes, g: p.goals, avg: p.matches ? (p.goals / p.matches).toFixed(2) : "0.00" }))} />
            <StatsTable title="Top assists" columns={[{ key: "name", label: "Player", align: "left" }, { key: "m", label: "Games" }, { key: "a", label: "Assists" }]} rows={playerRows(assisters, (p) => ({ m: p.matches, a: p.assists }))} />
            <StatsTable title="Cards" columns={[{ key: "name", label: "Player", align: "left" }, { key: "gr", label: "Green" }, { key: "y", label: "Yellow" }, { key: "r", label: "Red" }]} rows={playerRows(carded, (p) => ({ gr: p.green, y: p.yellow, r: p.red }))} />
          </div>
        )}
        {category === "teams" && (
          <StatsTable title="Team statistics" columns={[{ key: "name", label: "Team", align: "left" }, { key: "p", label: "P" }, { key: "w", label: "W" }, { key: "d", label: "D" }, { key: "l", label: "L" }, { key: "gf", label: "GF" }, { key: "ga", label: "GA" }, { key: "gd", label: "GD" }, { key: "cs", label: "Clean sheets" }, { key: "avg", label: "Goals/game" }]} rows={teamRows} />
        )}
        {category === "discipline" && (
          <StatsTable title="Cards" columns={[{ key: "name", label: "Player", align: "left" }, { key: "gr", label: "Green" }, { key: "y", label: "Yellow" }, { key: "r", label: "Red" }]} rows={playerRows(carded, (p) => ({ gr: p.green, y: p.yellow, r: p.red }))} />
        )}
        <p className="text-[11px] text-white/40">Player figures come from match events entered for published, completed matches; a competition that doesn&apos;t record events will show team totals only.</p>
      </div>
    </div>
  );
}
