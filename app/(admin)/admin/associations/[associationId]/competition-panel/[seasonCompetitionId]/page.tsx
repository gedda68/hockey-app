import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import clientPromise from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";
import { userCanAccessAssociationResource } from "@/lib/auth/resourceAccessDb";
import { formatSeasonLabel } from "@/lib/competitions/seasonLabel";
import FixtureOperationsConsole from "@/components/admin/associations/FixtureOperationsConsole";
import MatchEventsEditorClient from "@/components/admin/associations/MatchEventsEditorClient";
import DivisionTeamOverviewClient from "@/components/admin/associations/DivisionTeamOverviewClient";
import CompetitionAwardsAdminClient from "@/components/admin/CompetitionAwardsAdminClient";
import CompetitionTeamsTab from "@/components/admin/associations/CompetitionTeamsTab";
import CompetitionLadderTab from "@/components/admin/associations/CompetitionLadderTab";
import CompetitionStatsStrip from "@/components/admin/associations/CompetitionStatsStrip";

const TABS = [
  ["overview", "Overview"],
  ["fixtures", "Fixtures & results"],
  ["events", "Match events"],
  ["teams", "Teams & rosters"],
  ["ladder", "Ladder"],
  ["awards", "Awards"],
] as const;

export default async function CompetitionWorkspacePage({
  params,
  searchParams,
}: {
  params: Promise<{ associationId: string; seasonCompetitionId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { associationId, seasonCompetitionId } = await params;
  const { tab: rawTab } = await searchParams;
  const tab = TABS.some(([k]) => k === rawTab) ? rawTab! : "overview";

  const session = await getSession();
  const here = `/admin/associations/${encodeURIComponent(associationId)}/competition-panel/${encodeURIComponent(seasonCompetitionId)}`;
  if (!session) redirect(`/login?next=${here}`);
  if (!(await userCanAccessAssociationResource(session, associationId))) {
    redirect("/admin/competition-panel");
  }

  const client = await clientPromise;
  const db = client.db(process.env.DB_NAME || "hockey-app");
  const [association, sc] = await Promise.all([
    db.collection("associations").findOne({ associationId }),
    db.collection("season_competitions").findOne({ seasonCompetitionId, owningAssociationId: associationId }),
  ]);
  if (!association || !sc) notFound();

  let name = typeof sc.competitionName === "string" ? sc.competitionName : undefined;
  if (!name && sc.competitionId) {
    const c = await db.collection("competitions").findOne({ competitionId: sc.competitionId });
    name = (c?.name as string | undefined) ?? undefined;
  }
  const label = formatSeasonLabel({ season: sc.season, displayName: sc.displayName, competitionName: name });
  const associationName = association.name as string;
  const primaryColor = (association.branding as { primaryColor?: string } | undefined)?.primaryColor || "#06054e";
  const q = (t: string) => `${here}?tab=${t}&seasonCompetitionId=${encodeURIComponent(seasonCompetitionId)}`;

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <div>
        <Link
          href={`/admin/associations/${encodeURIComponent(associationId)}/competition-panel`}
          className="inline-flex items-center gap-1 text-sm font-bold text-slate-500 hover:text-[#06054e]"
        >
          <ChevronLeft size={16} /> All competitions
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-black text-[#06054e] sm:text-3xl">{label}</h1>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-extrabold uppercase text-slate-600">
            {String(sc.status ?? "").replace("_", " ")}
          </span>
        </div>
        <p className="text-sm text-slate-500">{associationName}</p>
      </div>

      <nav aria-label="Competition sections" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <ul className="flex min-w-max gap-1 border-b border-slate-200">
          {TABS.map(([k, text]) => (
            <li key={k}>
              <Link
                href={q(k)}
                aria-current={tab === k ? "page" : undefined}
                className={`block border-b-2 px-4 py-2.5 text-sm font-bold transition ${
                  tab === k ? "border-[#06054e] text-[#06054e]" : "border-transparent text-slate-500 hover:text-[#06054e]"
                }`}
              >
                {text}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <section>
        {tab === "overview" && <WorkspaceOverview associationId={associationId} seasonCompetitionId={seasonCompetitionId} q={q} />}
        {tab === "fixtures" && (
          <FixtureOperationsConsole key={seasonCompetitionId} associationId={associationId} associationName={associationName} primaryColor={primaryColor} initialSeasonCompetitionId={seasonCompetitionId} />
        )}
        {tab === "events" && (
          <MatchEventsEditorClient key={seasonCompetitionId} associationId={associationId} associationName={associationName} primaryColor={primaryColor} initialSeasonCompetitionId={seasonCompetitionId} />
        )}
        {tab === "teams" && (
          <div className="space-y-8">
            <CompetitionTeamsTab key={seasonCompetitionId} seasonCompetitionId={seasonCompetitionId} />
            <details className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <summary className="cursor-pointer text-sm font-bold text-[#06054e]">Division assignments</summary>
              <div className="mt-4">
                <DivisionTeamOverviewClient key={seasonCompetitionId} seasonCompetitionId={seasonCompetitionId} associationId={associationId} associationName={associationName} primaryColor={primaryColor} />
              </div>
            </details>
          </div>
        )}
        {tab === "ladder" && <CompetitionLadderTab seasonCompetitionId={seasonCompetitionId} />}
        {tab === "awards" && <Suspense fallback={null}><CompetitionAwardsAdminClient /></Suspense>}
      </section>
    </div>
  );
}

function WorkspaceOverview({
  associationId, seasonCompetitionId, q,
}: { associationId: string; seasonCompetitionId: string; q: (t: string) => string }) {
  const tiles: [string, string, string][] = [
    ["fixtures", "Fixtures & results", "Reschedule, change venue, enter or approve results, forfeit or void."],
    ["events", "Match events", "Goals, cards and timeline for every match."],
    ["teams", "Teams & rosters", "Division teams and season rosters."],
    ["ladder", "Ladder", "Live standings and recalculation."],
    ["awards", "Awards", "Player of the match and season awards."],
  ];
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map(([k, title, desc]) => (
          <Link key={k} href={q(k)} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#06054e]/40 hover:shadow-lg">
            <h2 className="font-black text-[#06054e]">{title}</h2>
            <p className="mt-1 text-sm text-slate-500">{desc}</p>
          </Link>
        ))}
      </div>
      <CompetitionStatsStrip associationId={associationId} seasonCompetitionId={seasonCompetitionId} />
    </div>
  );
}

export async function generateMetadata() {
  return { title: "Competition | Admin" };
}
