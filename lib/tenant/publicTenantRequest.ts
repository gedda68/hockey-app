import type { Db } from "mongodb";
import type { NextRequest } from "next/server";
import clientPromise from "@/lib/mongodb";
import {
  resolvePortalSlugForRequest,
  resolveTenantByPortalSlug,
  type PublicTenantPayload,
} from "@/lib/tenant/portalHost";

export async function resolvePublicTenantFromRequest(
  request: NextRequest,
): Promise<PublicTenantPayload | null> {
  const host =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    "";
  const queryPortal = request.nextUrl.searchParams.get("portal");
  const slug = resolvePortalSlugForRequest(host, queryPortal);
  if (!slug) return null;

  const client = await clientPromise;
  const db = client.db(process.env.DB_NAME || "hockey-app") as unknown as Db;
  return resolveTenantByPortalSlug(db, slug);
}

export async function resolveClubAssociationId(
  db: Db,
  clubId: string,
): Promise<string | null> {
  const key = clubId.trim();
  if (!key) return null;
  const club = await db.collection("clubs").findOne({
    $or: [{ id: key }, { clubId: key }, { slug: key }],
  });
  if (!club) return null;
  const assocId = club.associationId ?? club.parentAssociationId;
  return assocId ? String(assocId) : null;
}

