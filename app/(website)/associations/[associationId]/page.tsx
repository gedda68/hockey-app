import type { Metadata } from "next";
import { getPublicAssociationById } from "@/lib/public/publicAssociation";
import AssociationHubView from "@/components/website/associations/AssociationHubView";

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

export default async function AssociationHubPage({ params }: Props) {
  const { associationId } = await params;
  return <AssociationHubView associationId={associationId} />;
}
