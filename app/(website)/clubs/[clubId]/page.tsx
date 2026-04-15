import ClubHubView from "@/components/website/clubs/ClubHubView";
import { getPublicTenantForServerPage } from "@/lib/tenant/serverTenant";

export const dynamic = "force-dynamic";

export default async function ClubHubPage({
  params,
  searchParams,
}: {
  params: Promise<{ clubId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { clubId } = await params;
  const sp = await searchParams;
  const tenant = await getPublicTenantForServerPage(sp);
  return <ClubHubView clubId={clubId} tenant={tenant} />;
}
