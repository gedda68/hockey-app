// lib/auth/sessionFreshness.ts
// Keeps a signed-in session in step with role changes made after it was issued.
//
// The session cookie holds the person's current role and organisation. When a role is ended (or granted)
// the member's `roleVersion` is bumped; a session whose copy is behind is checked against the database:
//  - the role it is using is still held  -> keep it, just record the new version
//  - the role has ended                  -> move to the best remaining organisation, or the personal view

import { ObjectId, type Db } from "mongodb";
import { getDatabase } from "@/lib/mongodb";
import { createSession, getSession, type ScopedRole, type SessionData } from "@/lib/auth/session";
import { normalizeMemberRoles } from "@/lib/auth/memberRoles";
import { toScopedRoles } from "@/lib/auth/toScopedRoles";
import { legacyAssignmentsFor } from "@/lib/access/matrix";
import { blueCardStatus } from "@/lib/members/blueCard";
import { buildPersonaOptions, sessionWithPersona, PERSONAL_PERSONA_KEY } from "@/lib/auth/sessionPersona";
import type { RoleAssignment } from "@/lib/types/roles";

/** Whether the role and organisation the session is using are still among the person's current roles. */
export function isPersonaStillHeld(
  session: Pick<SessionData, "role" | "clubId" | "associationId">,
  held: ScopedRole[],
  baselineRoles: string[] = [],
): boolean {
  if (session.role === "super-admin") return true;
  // Not working inside an organisation: nothing to have lost.
  if (!session.clubId && !session.associationId) return true;
  // The person's own default role (members.auth.role) is not a grant that can be ended.
  if (baselineRoles.includes(session.role)) return true;
  return held.some((sr) => {
    if (sr.role !== session.role) return false;
    if (sr.scopeType === "global") return true;
    if (session.clubId && sr.scopeType === "club") return sr.scopeId === session.clubId;
    if (session.associationId && sr.scopeType === "association") return sr.scopeId === session.associationId;
    return false;
  });
}

// Tiny per-process cache so a burst of API calls costs one lookup, not one each.
const versionCache = new Map<string, { v: number; at: number }>();
const TTL_MS = 3000;

export interface FreshnessResult {
  session: SessionData;
  /** The cookie should be re-issued. */
  changed: boolean;
}

export async function refreshStaleSession(db: Db, session: SessionData, now = Date.now()): Promise<FreshnessResult> {
  const unchanged = { session, changed: false };
  const memberId = session.memberId ? String(session.memberId) : "";
  // Staff logins keep the roles on their own account; only member logins are rebuilt from the member record.
  if (!memberId || !ObjectId.isValid(memberId) || session.role === "super-admin" || session.staffUser) return unchanged;

  const have = session.roleVersion ?? 0;
  const cached = versionCache.get(memberId);
  if (cached && now - cached.at < TTL_MS && cached.v === have) return unchanged;

  const m = (await db.collection("members").findOne(
    { _id: new ObjectId(memberId) },
    { projection: { roleVersion: 1, roles: 1, roleHoldings: 1, blueCard: 1, clubId: 1, "membership.clubId": 1, "auth.role": 1, "preferences.lastPersonaKey": 1 } },
  )) as Record<string, any> | null;
  if (!m) return unchanged;

  const version = typeof m.roleVersion === "number" ? m.roleVersion : 0;
  if (versionCache.size > 5000) versionCache.clear();
  versionCache.set(memberId, { v: version, at: now });
  if (version === have) return unchanged;

  const held = toScopedRoles([
    ...normalizeMemberRoles(m.roles, m.membership?.clubId || m.clubId || session.clubId),
    ...(legacyAssignmentsFor(Array.isArray(m.roleHoldings) ? m.roleHoldings : [], { blueCardValid: blueCardStatus(m.blueCard).ok }) as RoleAssignment[]),
  ]);
  const baseline = typeof m.auth?.role === "string" ? [m.auth.role] : [];

  if (isPersonaStillHeld(session, held, baseline)) {
    return { session: { ...session, roleVersion: version }, changed: true };
  }

  // The role in use has ended: pick the best remaining place to be.
  const options = await buildPersonaOptions(db, { ...session, role: "member", clubId: null, associationId: null, scopedRoles: undefined, clubSlug: null, clubName: undefined });
  const remembered = m.preferences?.lastPersonaKey;
  const key =
    options.find((o) => o.key === remembered && o.key !== PERSONAL_PERSONA_KEY)?.key ??
    options.find((o) => o.scopeType !== "global")?.key ??
    PERSONAL_PERSONA_KEY;
  const next = await sessionWithPersona(db, { ...session, roleVersion: version }, key).catch(() => null);
  if (next) return { session: { ...next, roleVersion: version }, changed: true };
  return {
    session: { ...session, role: "member", clubId: null, clubSlug: null, clubName: undefined, associationId: null, associationLevel: undefined, scopedRoles: undefined, portalSubdomain: null, roleVersion: version },
    changed: true,
  };
}

/** The signed-in session, brought up to date. Re-issues the cookie when it can (Route Handlers). */
export async function getFreshSession(): Promise<SessionData | null> {
  const session = await getSession();
  if (!session) return null;
  try {
    const db = await getDatabase();
    const r = await refreshStaleSession(db, session);
    if (r.changed) {
      try {
        await createSession(r.session);
      } catch {
        // Server Components cannot set cookies; the fresh data is still returned for this request.
      }
    }
    return r.session;
  } catch (e) {
    console.error("getFreshSession:", e);
    return session; // never take a request down because the freshness check failed
  }
}
