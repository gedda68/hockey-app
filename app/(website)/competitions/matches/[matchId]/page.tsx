import { notFound } from "next/navigation";
import PublicMatchCentreClient from "@/components/matches/PublicMatchCentreClient";
import { getPublicMatchCentreById } from "@/lib/data/matches";
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

  return <PublicMatchCentreClient initialCentre={centre} fixtureId={matchId} />;
}
