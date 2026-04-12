// Club dashboard

import ClubSiteDashboard from "@/components/clubs/ClubSiteDashboard";

export default async function ClubDashboardPage({
  params,
}: {
  params: Promise<{ clubId: string }>;
}) {
  const { clubId } = await params;
  return <ClubSiteDashboard clubId={clubId} />;
}
