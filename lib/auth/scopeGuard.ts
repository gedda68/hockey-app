/**
 * lib/auth/scopeGuard.ts
 *
 * Shared helper for scope-aware access checks inside API route handlers.
 *
 * Problem it solves
 * -----------------
 * Several routes accept a `clubId` or `associationId` from URL params or the
 * request body. Without an explicit re-check, a session-authenticated user
 * could substitute a different org's ID and read or mutate data they should
 * not see — a classic "horizontal privilege escalation" (IDOR) pattern.
 *
 * Usage
 * -----
 * ```ts
 * import { assertScopeMatch } from "@/lib/auth/scopeGuard";
 *
 * const guard = await assertScopeMatch(session, "club", clubId);
 * if (guard) return guard;   // returns 403 NextResponse
 * ```
 *
 * The helper delegates to the existing DB-backed scope functions in
 * `lib/auth/resourceAccessDb.ts` so the logic stays in one place.
 */

import { NextResponse } from "next/server";
import type { SessionData } from "@/lib/auth/session";
import {
  userCanAccessAssociationResource,
  userCanAccessClubResource,
} from "@/lib/auth/resourceAccessDb";

export type ScopeType = "association" | "club";

/**
 * Returns a 403 `NextResponse` if the session does NOT have access to the
 * requested scope, or `null` if access is granted.
 *
 * @param session  The current session (from `getSession()`). Null → 401.
 * @param type     "association" or "club"
 * @param id       The association/club ID or slug from URL params / body.
 */
export async function assertScopeMatch(
  session: SessionData | null,
  type: ScopeType,
  id: string,
): Promise<NextResponse | null> {
  if (!session) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  }

  if (!id) {
    return NextResponse.json(
      { error: `${type === "association" ? "associationId" : "clubId"} is required` },
      { status: 400 },
    );
  }

  const allowed =
    type === "association"
      ? await userCanAccessAssociationResource(session, id)
      : await userCanAccessClubResource(session, id);

  if (!allowed) {
    return NextResponse.json(
      {
        error: "Forbidden",
        detail: `You do not have ${type}-level access to this resource.`,
      },
      { status: 403 },
    );
  }

  return null; // access granted
}

/**
 * Payment-specific scope check.
 *
 * Rules:
 *  - super-admin          → access all
 *  - association-admin    → payments for members in clubs under their association
 *  - club-admin/registrar → payments for members in their club
 *  - any authenticated member → only their own payments (memberId === session id)
 *
 * Returns a filter object to narrow the MongoDB query, or a NextResponse if
 * the caller should be rejected outright.
 */
export async function buildPaymentScopeFilter(
  session: SessionData | null,
  requestedMemberId?: string | null,
): Promise<{ filter: Record<string, unknown> } | { response: NextResponse }> {
  if (!session) {
    return {
      response: NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      ),
    };
  }

  const role = session.role;

  // Super-admin: no filter (sees everything), but still honour explicit memberId param
  if (role === "super-admin") {
    const filter: Record<string, unknown> = {};
    if (requestedMemberId) filter.memberId = requestedMemberId;
    return { filter };
  }

  // Association-admin / assoc-registrar: filter to memberId values whose club
  // sits under the admin's association. We express this as a DB-side lookup
  // at query time by adding `owningAssociationId` to the filter (assuming
  // payments store it, which P1 will enforce). For now also accept explicit
  // memberId if it's the caller's own.
  if (
    ["association-admin", "assoc-registrar"].includes(role) &&
    session.associationId
  ) {
    if (requestedMemberId) {
      // Narrow to requested member — DB layer will enforce association scope
      return { filter: { memberId: requestedMemberId } };
    }
    return { filter: { owningAssociationId: session.associationId } };
  }

  // Club-admin / registrar: filter to their club
  if (["club-admin", "registrar"].includes(role) && (session.clubId || session.clubSlug)) {
    const clubRef = session.clubId || session.clubSlug;
    if (requestedMemberId) {
      return { filter: { memberId: requestedMemberId, clubId: clubRef } };
    }
    return { filter: { clubId: clubRef } };
  }

  // Regular member: can only see their own payments
  const ownId = session.memberId || session.userId;
  if (!ownId) {
    return {
      response: NextResponse.json(
        { error: "Forbidden — cannot determine your member identity" },
        { status: 403 },
      ),
    };
  }

  // If they explicitly asked for someone else's payments, block it
  if (requestedMemberId && requestedMemberId !== ownId) {
    return {
      response: NextResponse.json(
        { error: "Forbidden — you may only view your own payments" },
        { status: 403 },
      ),
    };
  }

  return { filter: { memberId: ownId } };
}

/**
 * Check whether the session holder can mutate a specific payment record.
 *
 * Returns a 403 response if denied, or null if allowed.
 */
export async function assertPaymentMutationAccess(
  session: SessionData | null,
  paymentMemberId: string,
  paymentClubId?: string,
): Promise<NextResponse | null> {
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const role = session.role;

  if (role === "super-admin") return null;

  if (["association-admin", "assoc-registrar"].includes(role)) {
    // Trust that the DB-side owningAssociationId check will enforce scope;
    // here we just allow the role through.
    if (session.associationId) return null;
  }

  if (["club-admin", "registrar"].includes(role)) {
    const clubRef = session.clubId || session.clubSlug;
    if (clubRef && paymentClubId && clubRef === paymentClubId) return null;
    if (clubRef && !paymentClubId) return null; // club not on old record, allow admin
  }

  // Members can withdraw their own pending payments (handled in route)
  const ownId = session.memberId || session.userId;
  if (ownId && ownId === paymentMemberId) return null;

  return NextResponse.json(
    { error: "Forbidden — you do not have permission to modify this payment" },
    { status: 403 },
  );
}
