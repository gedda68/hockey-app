// lib/access/areaAccess.ts
// Page/API enforcement from the Roles & Access Matrix area codes (shared by server and client).
//
//   "-"  hidden            "V" public view      "O" own records only
//   "R"  read everything   "E" add / edit       "A" delete, approve, export, bulk
//
// The matrix is only enforced for people whose current role actually comes from a matrix role. Anyone else
// (legacy admins, super-admin, people with no matrix roles in this organisation) keeps the existing behaviour,
// so nobody is locked out while pages move over one at a time.

import { codeAtLeast, getMatrixRole, legacyRoleFor, type AccessCode, type OrgType } from "@/lib/access/matrix";

export type LogicalArea = "members" | "teams" | "fees";

const AREA_KEY: Record<LogicalArea, Record<OrgType, string>> = {
  members: { club: "membersRegistrations", association: "memberRegistry" },
  teams: { club: "teamsSquads", association: "pathwaysRepTeams" },
  fees: { club: "financeFees", association: "financeFeesLevies" },
};

export function areaKey(area: LogicalArea, orgType: OrgType): string {
  return AREA_KEY[area][orgType];
}

/** Minimal shape of the access payload (matches `AccessPayload`). */
export interface AccessLike {
  context: { kind: string; orgType?: OrgType; orgId?: string };
  areas: Record<string, AccessCode>;
  roles: { key: string }[];
}

export interface AreaDecision {
  /** Whether the matrix applies to this person right now. */
  enforced: boolean;
  /** The person's code in the area (only meaningful when enforced). */
  code: AccessCode;
  /** Allowed to do what was asked. Always true when not enforced. */
  allowed: boolean;
}

export function decideArea(access: AccessLike | null | undefined, sessionRole: string | undefined, area: LogicalArea, need: AccessCode): AreaDecision {
  const free: AreaDecision = { enforced: false, code: "A", allowed: true };
  if (!access || sessionRole === "super-admin") return free;
  if (access.context.kind !== "org" || !access.context.orgType || access.roles.length === 0) return free;
  // Only enforce when the person's current coarse role was derived from one of their matrix roles.
  const derived = new Set(access.roles.map((r) => { const m = getMatrixRole(r.key); return m ? legacyRoleFor(m) : null; }));
  if (!sessionRole || !derived.has(sessionRole as never)) return free;
  const code = access.areas[areaKey(area, access.context.orgType)] ?? "-";
  return { enforced: true, code, allowed: codeAtLeast(code, need) };
}

/** What a method needs by default: read everything for GET, edit for writes, admin for DELETE. */
export function needForMethod(method: string, readNeed: AccessCode = "R"): AccessCode {
  const m = method.toUpperCase();
  if (m === "GET" || m === "HEAD") return readNeed;
  if (m === "DELETE") return "A";
  return "E";
}

// ── Scope: Team / Age group / Assigned matches / Rep squad ───────────────────

import { resolveAccess, codeForTarget, type RoleHolding, type ScopeTarget } from "@/lib/access/matrix";

/**
 * Like `decideArea`, but for one record: a Head Coach with Edit on Teams only gets Edit on THEIR team.
 * `holdings` are the person's matrix role holdings (any organisation); the current organisation comes from `access.context`.
 */
export function decideAreaForTarget(
  access: AccessLike | null | undefined,
  holdings: RoleHolding[],
  blueCardValid: boolean,
  sessionRole: string | undefined,
  area: LogicalArea,
  need: AccessCode,
  target: ScopeTarget,
): AreaDecision {
  const base = decideArea(access, sessionRole, area, need);
  if (!base.enforced || !access || access.context.kind !== "org" || !access.context.orgType) return base;
  const res = resolveAccess(holdings, access.context as never, { blueCardValid });
  const code = codeForTarget(res, areaKey(area, access.context.orgType), { clubId: access.context.orgId, ...target });
  return { enforced: true, code, allowed: codeAtLeast(code, need) };
}
