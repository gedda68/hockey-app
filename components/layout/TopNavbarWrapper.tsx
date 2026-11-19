// components/layout/TopNavbarWrapper.tsx
// Server component: tenant-scoped clubs drawer + ticker when on an association host.

import { headers } from "next/headers";
import clientPromise, { isMongoConnectionError } from "@/lib/mongodb";
import TopNavbar from "./TopNavbar";
import { clubPortalHomeUrl } from "@/lib/tenant/subdomainUrls";
import { getCompletedMatches } from "@/lib/data/matches";
import { buildTickerLines } from "@/lib/competitions/tickerLines";
import type { TickerLine } from "@/components/website/home/HomeResultsTicker";
import {
  resolvePortalSlugForRequest,
  resolveTenantByPortalSlug,
} from "@/lib/tenant/portalHost";
import { listPublicClubsByAssociation } from "@/lib/public/publicClubs";

function mapClubForNav(club: {
  name?: string;
  title?: string;
  slug?: string;
  shortName?: string;
  abbreviation?: string;
  portalSlug?: string;
  icon?: string;
  iconSrc?: string;
  logo?: string;
  colors?: { primary?: string };
}) {
  return {
    name: String(club.name || club.title || "Unknown Club"),
    slug: String(club.slug || ""),
    portalHomeUrl: clubPortalHomeUrl({
      shortName: club.shortName,
      abbreviation: club.abbreviation,
      portalSlug: club.portalSlug,
      slug: String(club.slug || ""),
    }),
    icon: club.icon,
    iconSrc: club.iconSrc,
    logo: club.logo,
    shortName: club.shortName || club.abbreviation,
    colors: {
      primary: club.colors?.primary || "#06054e",
    },
  };
}

export default async function TopNavbarWrapper() {
  const headersList = await headers();
  const host =
    headersList.get("x-forwarded-host") ?? headersList.get("host") ?? "";
  const slug = resolvePortalSlugForRequest(host, null);

  let clubs: ReturnType<typeof mapClubForNav>[] = [];
  let tickerLines: TickerLine[] = [];

  try {
    const client = await clientPromise;
    const db = client.db();
    const tenant =
      slug && slug.length > 0
        ? await resolveTenantByPortalSlug(db, slug)
        : null;

    if (tenant?.kind === "association") {
      const rows = await listPublicClubsByAssociation(tenant.id, { limit: 200 });
      clubs = rows.map((c) =>
        mapClubForNav({
          name: c.name,
          slug: c.slug,
          shortName: c.shortName,
          logo: c.logo,
          iconSrc: c.logo,
          colors: c.colors,
        }),
      );
    }

    if (clubs.length === 0) {
      const raw = await db.collection("clubs").find({ active: true }).toArray();
      clubs = raw.map((club) =>
        mapClubForNav(club as Parameters<typeof mapClubForNav>[0]),
      );
      clubs.sort((a, b) => a.name.localeCompare(b.name));
    }

    const matchOpts =
      tenant?.kind === "association"
        ? { owningAssociationId: tenant.id }
        : undefined;
    tickerLines = buildTickerLines(await getCompletedMatches(matchOpts), 24);
  } catch (error) {
    const tag = isMongoConnectionError(error)
      ? "[TopNavbarWrapper] MongoDB unavailable; rendering minimal navbar."
      : "[TopNavbarWrapper] Unexpected data error; rendering minimal navbar.";
    console.error(tag, error instanceof Error ? error.message : error);
  }

  return <TopNavbar clubs={clubs} tickerLines={tickerLines} />;
}
