import SponsorReportClient from "@/components/sponsors/SponsorReportClient";

export default async function PartnerAnalyticsPage({ params }: { params: Promise<{ associationId: string }> }) {
  const { associationId } = await params;
  return <SponsorReportClient scopeType="association" scopeId={associationId} />;
}
