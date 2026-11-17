// lib/clubs/guardClubRoute.ts
// One guard for the club-scoped member/roster API routes: the caller must be
// signed in, hold one of the listed permissions, and have access to the club.

import { NextRequest, NextResponse } from "next/server";
import clientPromise, { getDatabaseName } from "@/lib/mongodb";
import {
  requireAnyPermission,
  requireResourceAccess,
} from "@/lib/auth/middleware";
import type { Permission } from "@/lib/types/roles";

export interface GuardedClub {
  /** Canonical club id (never the slug). */
  clubId: string;
  slug?: string;
}

export type ClubGuardResult =
  | { club: GuardedClub; response?: undefined }
  | { club?: undefined; response: NextResponse };

/**
 * Order: 401 (not signed in) -> 403 (missing permission) -> 404 (unknown club)
 * -> 403 (no access to this club). Unknown clubs are only revealed after the
 * permission check so signed-out callers learn nothing.
 */
export async function guardClubRoute(
  request: NextRequest,
  clubIdOrSlug: string,
  permissions: Permission[],
): Promise<ClubGuardResult> {
  const { response: permRes } = await requireAnyPermission(request, [
    ...permissions,
    "system.manage",
  ]);
  if (permRes) return { response: permRes };

  const client = await clientPromise;
  const db = client.db(getDatabaseName());
  const club = await db
    .collection("clubs")
    .findOne({ $or: [{ id: clubIdOrSlug }, { slug: clubIdOrSlug }] });

  if (!club) {
    return {
      response: NextResponse.json({ error: "Club not found" }, { status: 404 }),
    };
  }

  const { response: scopeRes } = await requireResourceAccess(
    request,
    "club",
    club.id as string,
  );
  if (scopeRes) return { response: scopeRes };

  return { club: { clubId: club.id as string, slug: club.slug as string | undefined } };
}

/**
 * Member fields a club-level edit may NOT change: identity, ownership, login
 * and role fields. Everything else stays editable as before.
 */
export const PROTECTED_MEMBER_FIELDS = [
  "_id",
  "memberId",
  "clubId",
  "userId",
  "username",
  "password",
  "passwordHash",
  "roles",
  "role",
  "scopedRoles",
  "roleHoldings",
  "permissions",
  "isSuperAdmin",
  "createdAt",
  "family",
] as const;

export function stripProtectedMemberFields(
  updates: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(updates ?? {})) {
    const root = k.split(".")[0];
    if ((PROTECTED_MEMBER_FIELDS as readonly string[]).includes(root)) continue;
    if (k.startsWith("$")) continue;
    out[k] = v;
  }
  return out;
}
