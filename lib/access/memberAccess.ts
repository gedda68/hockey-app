// lib/access/memberAccess.ts
// Server helpers: load a member's matrix role holdings and compute the access for the organisation they are
// currently working in.

import type { Db } from "mongodb";
import { ObjectId } from "mongodb";
import type { SessionData } from "@/lib/auth/session";
import { blueCardStatus } from "@/lib/members/blueCard";
import {
  resolveAccess, contextOptions, getMatrixRole,
  type AccessContext, type AccessCode, type RoleHolding, type OrgType,
} from "@/lib/access/matrix";

export interface MemberHoldings { holdings: RoleHolding[]; blueCardValid: boolean }

/** Holdings are stored on the member as `roleHoldings` (created when an appointment is accepted). */
export async function loadMemberHoldings(db: Db, session: Pick<SessionData, "memberId">): Promise<MemberHoldings> {
  if (!session.memberId || !ObjectId.isValid(String(session.memberId))) return { holdings: [], blueCardValid: false };
  const m = await db.collection("members").findOne(
    { _id: new ObjectId(String(session.memberId)) },
    { projection: { roleHoldings: 1, blueCard: 1 } },
  );
  const holdings = Array.isArray(m?.roleHoldings) ? (m!.roleHoldings as RoleHolding[]).filter((h) => h && typeof h.roleKey === "string") : [];
  return { holdings, blueCardValid: blueCardStatus(m?.blueCard as any).ok };
}

/** The organisation the person is acting in: their active persona's club, else association, else personal. */
export function contextFromSession(session: Pick<SessionData, "clubId" | "associationId">): AccessContext {
  if (session.clubId) return { kind: "org", orgType: "club", orgId: String(session.clubId) };
  if (session.associationId) return { kind: "org", orgType: "association", orgId: String(session.associationId) };
  return { kind: "personal" };
}

export interface AccessPayload {
  context: AccessContext;
  areas: Record<string, AccessCode>;
  level: number;
  roles: { key: string; name: string }[];
  /** Roles that exist but are not active yet (e.g. waiting on a Blue Card). */
  inactive: { key: string; name: string; reason: string }[];
  /** Organisations the person can switch between. */
  contexts: { orgType: OrgType; orgId: string; roleNames: string[] }[];
}

export async function accessForSession(db: Db, session: SessionData): Promise<AccessPayload> {
  const { holdings, blueCardValid } = await loadMemberHoldings(db, session);
  const context = contextFromSession(session);
  const res = resolveAccess(holdings, context, { blueCardValid });
  return {
    context,
    areas: res.areas,
    level: res.level,
    roles: res.roles.map((r) => ({ key: r.role.key, name: r.role.name })),
    inactive: res.inactive.map((i) => ({ key: i.roleKey, name: getMatrixRole(i.roleKey)?.name ?? i.roleKey, reason: i.reason })),
    contexts: contextOptions(holdings, { blueCardValid }),
  };
}
