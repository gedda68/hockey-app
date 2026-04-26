import PartnerClickStatsClient from "@/components/admin/analytics/PartnerClickStatsClient";

export default async function ClubPartnerAnalyticsPage({
  params,
}: {
  params: Promise<{ clubId: string }>;
}) {
  const { clubId } = await params;
  const apiPath = `/api/admin/clubs/${encodeURIComponent(clubId)}/partner-click-stats`;
  return <PartnerClickStatsClient title="Partner strip analytics" apiPath={apiPath} />;
}
