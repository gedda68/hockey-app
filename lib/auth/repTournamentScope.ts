// D1 — Resource scope for rep_tournaments (club host vs association host).

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { SessionData } from "@/lib/auth/session";
import { requireAuth } from "@/lib/auth/middleware";
import type { UserSession } from "@/lib/db/schemas/user";
import {
  userCanAccessAssociationResource,
  userCanAccessClubResource,
} from "@/lib/auth/resourceAccessDb";
import { getSession } from "@/lib/auth/session";

export type RepTournamentHostDoc = {
  hostType?: string | null;
  hostId?: string | null;
  brandingAssociationId?: string | null;
};

/**
 * Legacy rows (no host fields): visible to anyone with route permission (e.g. selection.manage).
 */
export async function userCanAccessRepTournament(
  session: SessionData | null,
  doc: RepTournamentHostDoc,
): Promise<boolean> {
  if (!session) return false;
  if (session.role === "super-admin") return true;

  const hostType = doc.hostType ?? null;
  const hostId = doc.hostId?.trim() || null;
  const brandingId = doc.brandingAssociationId?.trim() || null;

  if (!hostType && !hostId && !brandingId) {
    return true;
  }

  if (hostType === "association") {
    const orgs = [hostId, brandingId].filter(Boolean) as string[];
    if (orgs.length === 0) return true;
    for (const id of new Set(orgs)) {
      if (await userCanAccessAssociationResource(session, id)) return true;
    }
    return false;
  }

  if (hostType === "club" && hostId) {
    if (await userCanAccessClubResource(session, hostId)) return true;
    if (brandingId && (await userCanAccessAssociationResource(session, brandingId))) {
      return true;
    }
    return false;
  }

  if (brandingId) {
    return userCanAccessAssociationResource(session, brandingId);
  }

  return false;
}

/**
 * Enforce tournament host scope after permission check. Returns 403 if user cannot access host.
 */
export async function requireRepTournamentResourceAccess(
  request: NextRequest,
  doc: RepTournamentHostDoc,
): Promise<{ user: UserSession; response?: NextResponse }> {
  const { user, response } = await requireAuth(request);
  if (response) return { user, response };

  const session = await getSession();
  const ok = await userCanAccessRepTournament(session, doc);
  if (ok) {
    return { user };
  }

  return {
    user,
    response: NextResponse.json(
      {
        error:
          "Forbidden — you do not have access to this tournament's host (association or club)",
      },
      { status: 403 },
    ),
  };
}
