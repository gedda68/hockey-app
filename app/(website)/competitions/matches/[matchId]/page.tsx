import { notFound } from "next/navigation";
import PublicMatchCentreClient from "@/components/matches/PublicMatchCentreClient";
import { getPublicMatchCentreById, getSeasonCompetitionOptions } from "@/lib/data/matches";
import { getDivisionMatchList } from "@/lib/data/divisionMatchList";
import { buildCompetitionPicker } from "@/lib/competitions/competitionPickerOptions";
import MatchQuickLinks from "@/components/matches/MatchQuickLinks";
import { getPublicTenantForServerPage } from "@/lib/tenant/serverTenant";

export const dynamic = "force-dynamic";

export default async function MatchCentrePage({
  params,
  searchParams,
}: {
  params: Promise<{ matchId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { matchId } = await params;
  const sp = await searchParams;
  const tenant = await getPublicTenantForServerPage(sp);
  const centre = await getPublicMatchCentreById(matchId, tenant);
  if (!centre) notFound();

  const scId = centre.match.seasonCompetitionId ?? "";
  const [options, divisionMatches] = await Promise.all([
    getSeasonCompetitionOptions().catch(() => []),
    scId ? getDivisionMatchList(scId).catch(() => []) : Promise.resolve([]),
  ]);
  const seasons = buildCompetitionPicker(options.map((o) => ({ ...o, href: "" })));

  return (
    <PublicMatchCentreClient
      initialCentre={centre}
      fixtureId={matchId}
      sidebar={
        seasons.length > 0 && scId ? (
          <MatchQuickLinks
            key={`quick-links-${scId}`}
            seasons={seasons}
            currentFixtureId={centre.match.matchId || matchId}
            currentSeasonCompetitionId={scId}
            initialMatches={divisionMatches}
          />
        ) : null
      }
    />
  );
}
