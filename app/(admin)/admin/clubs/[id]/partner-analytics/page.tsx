import SponsorReportClient from "@/components/sponsors/SponsorReportClient";

export default async function PartnerAnalyticsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SponsorReportClient scopeType="club" scopeId={id} />;
}
