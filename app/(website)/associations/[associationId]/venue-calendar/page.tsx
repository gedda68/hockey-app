import type { Metadata } from "next";
import { getPublicAssociationById } from "@/lib/public/publicAssociation";
import VenuePitchCalendarClient from "@/components/website/associations/VenuePitchCalendarClient";
import {
  absolutizeOpenGraphUrl,
  canonicalFromPath,
} from "@/lib/seo/absolutizeMediaUrl";
import { requestMetadataBase } from "@/lib/tenant/requestMetadataBase";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ associationId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { associationId } = await params;
  const a = await getPublicAssociationById(associationId);
  if (!a) return { title: "Venue calendar" };
  const metadataBase = await requestMetadataBase();
  const path = `/associations/${encodeURIComponent(associationId)}/venue-calendar`;
  const canonical = canonicalFromPath(path, metadataBase);
  const title = `Pitch calendar — ${a.name}`;
  const ogImage = absolutizeOpenGraphUrl(a.branding?.logoUrl, metadataBase);
  return {
    title,
    description: `Weekly pitch use for ${a.name}: games, training, and private blocks (no hire labels).`,
    alternates: { canonical },
    openGraph: {
      type: "website",
      title,
      description: `Weekly pitch use for ${a.name}.`,
      url: canonical,
      images: ogImage ? [{ url: ogImage, alt: a.name }] : undefined,
    },
  };
}

export default async function VenueCalendarPage({ params, searchParams }: Props) {
  const { associationId } = await params;
  const sp = await searchParams;
  const assoc = await getPublicAssociationById(associationId);
  if (!assoc) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <p className="text-slate-600 font-bold">Association not found.</p>
      </div>
    );
  }

  const portalQ = typeof sp.portal === "string" ? sp.portal : null;

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <VenuePitchCalendarClient
        associationId={associationId}
        associationName={assoc.name}
        portalQuery={portalQ}
        initialVenueId=""
      />
    </div>
  );
}
