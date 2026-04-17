// Shared layout for all club pages - with padding for fixed main header

import type { Metadata } from "next";
import type { ComponentProps } from "react";
import Link from "next/link";
import ClubSiteShell from "@/components/clubs/ClubSiteShell";
import { loadClubPublicDocumentByUrlKey } from "@/lib/public/loadClubPublicDocument";
import {
  absolutizeOpenGraphUrl,
  canonicalFromPath,
} from "@/lib/seo/absolutizeMediaUrl";
import { requestMetadataBase } from "@/lib/tenant/requestMetadataBase";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ clubId: string }>;
}): Promise<Metadata> {
  const { clubId } = await params;
  const club = await loadClubPublicDocumentByUrlKey(clubId);
  const metadataBase = await requestMetadataBase();

  if (!club) {
    return { title: "Club" };
  }

  const name = String(
    (club.name as string | undefined) ??
      (club.title as string | undefined) ??
      "Club",
  );
  const slug = String((club.slug as string | undefined) || clubId).trim();
  const path = `/clubs/${slug}`;
  const canonical = canonicalFromPath(path, metadataBase);

  const logoRaw =
    (club.logo as string | undefined) ||
    (club.iconSrc as string | undefined) ||
    (typeof club.icon === "string" ? club.icon : undefined);
  const ogImage = absolutizeOpenGraphUrl(logoRaw, metadataBase);

  const description = `${name} — teams, registration, and club information.`;

  return {
    title: name,
    description,
    alternates: { canonical },
    openGraph: {
      type: "website",
      title: name,
      description,
      url: canonical,
      images: ogImage ? [{ url: ogImage, alt: name }] : undefined,
    },
    twitter: {
      card: ogImage ? "summary_large_image" : "summary",
      title: name,
      description,
      images: ogImage ? [ogImage] : undefined,
    },
  };
}

export default async function ClubLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ clubId: string }>;
}) {
  const { clubId } = await params;
  const club = await loadClubPublicDocumentByUrlKey(clubId);

  if (!club) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center pt-[180px]">
        <div className="text-center">
          <h1 className="text-4xl font-black text-red-600">Club Not Found</h1>
          <p className="mt-4 text-slate-600">
            The club you&apos;re looking for doesn&apos;t exist.
          </p>
          <Link
            href="/"
            className="mt-6 inline-block px-6 py-3 bg-[#06054e] text-white rounded-xl font-bold hover:bg-yellow-400 hover:text-[#06054e] transition-all"
          >
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  const routeSlug =
    String((club.slug as string | undefined) || "").trim() || clubId;

  return (
    <ClubSiteShell
      club={club as ComponentProps<typeof ClubSiteShell>["club"]}
      routeSlug={routeSlug}
    >
      {children}
    </ClubSiteShell>
  );
}
