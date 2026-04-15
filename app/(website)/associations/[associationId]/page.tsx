import type { Metadata } from "next";
import { getPublicAssociationById } from "@/lib/public/publicAssociation";
import AssociationHubView from "@/components/website/associations/AssociationHubView";
import { getPublicTenantForServerPage } from "@/lib/tenant/serverTenant";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ associationId: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { associationId } = await params;
  const a = await getPublicAssociationById(associationId);
  if (!a) return { title: "Association" };
  const title = `${a.name} | Association hub`;
  return {
    title,
    description: `${a.fullName} — leagues and tournaments in ${a.region}, ${a.state}.`,
    openGraph: { title },
  };
}

export default async function AssociationHubPage({
  params,
  searchParams,
}: {
  params: Promise<{ associationId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { associationId } = await params;
  const sp = await searchParams;
  const tenant = await getPublicTenantForServerPage(sp);
  return <AssociationHubView associationId={associationId} tenant={tenant} />;
}
