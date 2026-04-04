/**
 * GET /api/member/my-roles
 *
 * Returns the current member's live role assignments with expiry state.
 * Used by the My Registrations page to show renewal prompts.
 *
 * Response shape:
 *   {
 *     roles: EnrichedRoleAssignment[]
 *     expiringSoon: EnrichedRoleAssignment[]   — expires within WARN_DAYS
 *     expired: EnrichedRoleAssignment[]         — past expiresAt, still active:true
 *   }
 */

import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";
import { ROLE_DEFINITIONS } from "@/lib/types/roles";
import type { RoleAssignment } from "@/lib/types/roles";

/** Days before expiry to start showing the renewal prompt. */
const WARN_DAYS = 60;

export interface EnrichedRoleAssignment extends RoleAssignment {
  expiryState: "active" | "expiring-soon" | "expired";
  daysUntilExpiry?: number; // negative = already expired
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const memberId = session.memberId;
  if (!memberId) {
    return NextResponse.json({ roles: [], expiringSoon: [], expired: [] });
  }

  const client = await clientPromise;
  const db = client.db("hockey-app");

  const member = await db
    .collection("members")
    .findOne({ memberId }, { projection: { roles: 1 } });

  const rawRoles: RoleAssignment[] = (member?.roles ?? []) as RoleAssignment[];

  const now = new Date();
  const warnThreshold = new Date(now.getTime() + WARN_DAYS * 24 * 60 * 60 * 1000);

  const enriched: EnrichedRoleAssignment[] = rawRoles
    .filter((r) => r.active !== false)
    .map((r) => {
      if (!r.expiresAt) {
        return { ...r, expiryState: "active" as const };
      }
      const expiry = new Date(r.expiresAt);
      const daysUntilExpiry = Math.ceil(
        (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (expiry < now) {
        return { ...r, expiryState: "expired" as const, daysUntilExpiry };
      }
      if (expiry <= warnThreshold) {
        return { ...r, expiryState: "expiring-soon" as const, daysUntilExpiry };
      }
      return { ...r, expiryState: "active" as const, daysUntilExpiry };
    });

  // Only show renewal prompts for seasonal roles
  const seasonal = enriched.filter(
    (r) => ROLE_DEFINITIONS[r.role]?.seasonalRegistration
  );

  return NextResponse.json({
    roles: enriched,
    expiringSoon: seasonal.filter((r) => r.expiryState === "expiring-soon"),
    expired: seasonal.filter((r) => r.expiryState === "expired"),
  });
}
