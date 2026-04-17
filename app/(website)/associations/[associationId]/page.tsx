import type { Metadata } from "next";
import { getPublicAssociationById } from "@/lib/public/publicAssociation";
import AssociationHubView from "@/components/website/associations/AssociationHubView";
import {
  absolutizeOpenGraphUrl,
  canonicalFromPath,
} from "@/lib/seo/absolutizeMediaUrl";
import { getPublicTenantForServerPage } from "@/lib/tenant/serverTenant";
import { requestMetadataBase } from "@/lib/tenant/requestMetadataBase";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ associationId: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { associationId } = await params;
  const a = await getPublicAssociationById(associationId);
  if (!a) return { title: "Association" };
  const metadataBase = await requestMetadataBase();
  const path = `/associations/${encodeURIComponent(associationId)}`;
  const canonical = canonicalFromPath(path, metadataBase);
  const title = `${a.name} | Association hub`;
  const description = `${a.fullName} — leagues and tournaments in ${a.region}, ${a.state}.`;
  const ogImage = absolutizeOpenGraphUrl(
    a.branding?.logoUrl,
    metadataBase,
  );

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "website",
      title,
      description,
      url: canonical,
      images: ogImage ? [{ url: ogImage, alt: a.name }] : undefined,
    },
    twitter: {
      card: ogImage ? "summary_large_image" : "summary",
      title,
      description,
      images: ogImage ? [ogImage] : undefined,
    },
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
