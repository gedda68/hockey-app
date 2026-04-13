import type { Db } from "mongodb";
import type { SessionData } from "@/lib/auth/session";
import { resolvePortalSubdomainLabel } from "@/lib/auth/postLoginTenant";

/**
 * Fetches minimal club/association rows and sets `portalSubdomain` on the session
 * for Edge middleware redirects (no Mongo on the edge).
 */
export async function applyPortalSubdomainToSession(
  db: Db,
  session: SessionData,
): Promise<SessionData> {
  if (session.role === "super-admin") {
    return { ...session, portalSubdomain: null };
  }

  let club: {
    shortName?: string | null;
    abbreviation?: string | null;
    portalSlug?: string | null;
    slug?: string | null;
  } | null = null;
  if (session.clubId) {
    club = (await db.collection("clubs").findOne({
      $or: [{ id: session.clubId }, { clubId: session.clubId }],
    })) as typeof club;
  }

  let association: { code?: string | null; portalSlug?: string | null } | null =
    null;
  if (session.associationId) {
    association = (await db.collection("associations").findOne(
      { associationId: session.associationId },
      { projection: { code: 1, portalSlug: 1 } },
    )) as typeof association;
  }

  const portalSubdomain = resolvePortalSubdomainLabel({
    role: session.role,
    clubId: session.clubId ?? null,
    club,
    associationId: session.associationId ?? null,
    association,
  });

  return { ...session, portalSubdomain };
}
