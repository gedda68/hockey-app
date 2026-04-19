import PartnerClickStatsClient from "@/components/admin/analytics/PartnerClickStatsClient";

export default async function ClubPartnerAnalyticsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const apiPath = `/api/admin/clubs/${encodeURIComponent(id)}/partner-click-stats`;
  return <PartnerClickStatsClient title="Partner strip analytics" apiPath={apiPath} />;
}
