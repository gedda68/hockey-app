import PartnerClickStatsClient from "@/components/admin/analytics/PartnerClickStatsClient";

export default async function AssociationPartnerAnalyticsPage({
  params,
}: {
  params: Promise<{ associationId: string }>;
}) {
  const { associationId } = await params;
  const apiPath = `/api/admin/associations/${encodeURIComponent(associationId)}/partner-click-stats`;
  return (
    <PartnerClickStatsClient
      title="Partner strip analytics"
      apiPath={apiPath}
    />
  );
}
