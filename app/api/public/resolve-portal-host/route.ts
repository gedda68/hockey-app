/**
 * GET /api/public/resolve-portal-host
 *
 * Maps a public URL segment (club path id/slug or association key) to the
 * portal subdomain used in {slug}.{PORTAL_ROOT_DOMAIN}. Used by middleware
 * (Edge fetch) to redirect apex → tenant for club/association public pages.
 *
 * Query (one required):
 *   clubsSegment   — first segment under /clubs/[segment]/…
 *   associationKey — first segment under /associations/[key]/…
 */

import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { escapeRegex } from "@/lib/utils/regex";
import {
  associationPortalSubdomain,
  clubPortalSubdomain,
} from "@/lib/tenant/portalLabels";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const clubsSegment = searchParams.get("clubsSegment")?.trim();
  const associationKey = searchParams.get("associationKey")?.trim();

  if (!clubsSegment && !associationKey) {
    return NextResponse.json(
      { error: "clubsSegment or associationKey required" },
      { status: 400 },
    );
  }

  try {
    const db = await getDatabase();

    if (clubsSegment) {
      const safe = escapeRegex(clubsSegment);
      const club = await db.collection("clubs").findOne({
        $or: [
          { id: clubsSegment },
          { clubId: clubsSegment },
          { slug: { $regex: `^${safe}$`, $options: "i" } },
          { shortName: { $regex: `^${safe}$`, $options: "i" } },
        ],
      });
      if (club) {
        const slug = clubPortalSubdomain({
          shortName: club.shortName as string | undefined,
          abbreviation: club.abbreviation as string | undefined,
          portalSlug: club.portalSlug as string | undefined,
          slug: club.slug as string | undefined,
        });
        if (slug) {
          return NextResponse.json({
            kind: "club" as const,
            portalSlug: slug,
            clubId: String(club.id ?? club.clubId ?? ""),
          });
        }
      }
    }

    if (associationKey) {
      const safe = escapeRegex(associationKey);
      const assoc = await db.collection("associations").findOne({
        $or: [
          { associationId: associationKey },
          { code: { $regex: `^${safe}$`, $options: "i" } },
          { portalSlug: { $regex: `^${safe}$`, $options: "i" } },
        ],
      });
      if (assoc) {
        const slug = associationPortalSubdomain({
          code: assoc.code as string | undefined,
          portalSlug: assoc.portalSlug as string | undefined,
        });
        if (slug) {
          return NextResponse.json({
            kind: "association" as const,
            portalSlug: slug,
            associationId: String(assoc.associationId ?? ""),
          });
        }
      }
    }

    return NextResponse.json({ portalSlug: null }, { status: 404 });
  } catch (e) {
    console.error("resolve-portal-host:", e);
    return NextResponse.json({ error: "Resolve failed" }, { status: 500 });
  }
}
