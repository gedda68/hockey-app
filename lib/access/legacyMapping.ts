// lib/access/legacyMapping.ts
// Maps the older coarse roles (members.roles[] / approved role requests) onto Roles & Access Matrix holdings
// (members.roleHoldings[]), so both systems agree. Pure: no database access.
//
// Principles
//  - Never narrow anyone: a legacy role is only mapped when the matrix role can cover the same ground. Roles
//    whose matrix equivalent is per team / age group / squad / match are mapped only when the ids are known;
//    otherwise the result is "review" and the legacy role keeps working exactly as before.
//  - When a legacy role has several matrix roles that could fit, the more limited one is chosen.

import { getMatrixRole, type OrgType, type RoleHolding } from "@/lib/access/matrix";

export interface LegacyAssignment {
  role: string;
  scopeType: "global" | "association" | "club" | "team" | string;
  scopeId?: string;
  seasonYear?: string;
  expiresAt?: string;
  active?: boolean;
  grantedAt?: string;
  grantedBy?: string;
}

/** Facts the caller looks up for team-scoped assignments. */
export interface LegacyContext {
  /** Club that owns the team (needed when scopeType is "team"). */
  teamClubId?: string;
  now?: Date;
}

export type MigratedHolding = RoleHolding & {
  source: "legacy-migration";
  legacyRole: string;
  migratedAt: string;
};

export type LegacyOutcome =
  | { kind: "holding"; holding: MigratedHolding }
  | { kind: "skip"; reason: string }
  | { kind: "review"; reason: string };

/** Legacy role -> matrix role slug, per organisation type. */
export const CLUB_MAP: Record<string, string> = {
  "club-admin": "club-manager-administrator",
  "club-committee": "general-committee-member",
  registrar: "registrar-membership-secretary",
  "team-selector": "selector",
  player: "player",
  parent: "parent-guardian",
  volunteer: "volunteer-general",
  umpire: "club-umpire-referee",
  "technical-official": "scorer",
  "media-marketing": "social-media-manager",
};

export const ASSOC_MAP: Record<string, string> = {
  "association-admin": "ceo-general-manager",
  "assoc-committee": "board-director",
  "assoc-registrar": "registrar-membership-officer",
  "assoc-competition": "competition-manager",
  "assoc-coach": "coach-development-officer",
  "media-marketing": "communications-media-officer",
  umpire: "referee-umpire",
  "technical-official": "technical-official-judge",
  volunteer: "volunteer",
};

/** Coach / manager are per team in the matrix. */
const TEAM_MAP: Record<string, string> = {
  coach: "assistant-coach",
  manager: "team-manager",
};

/** Legacy roles with no matrix equivalent by design (access, not a position). */
const NO_EQUIVALENT = new Set(["super-admin", "public", "member"]);

/** Needs a person to choose teams / squads; reported, never guessed. */
const NEEDS_CHOICE: Record<string, string> = {
  coach: "club-wide coach: matrix coach roles are per team, so choose the teams in Role Holders",
  manager: "club-wide manager: matrix manager roles are per team, so choose the teams in Role Holders",
  "assoc-selector": "association selector: matrix selector roles are per rep squad, so choose the squads in Role Holders",
};

export function mapLegacyAssignment(a: LegacyAssignment, ctx: LegacyContext = {}): LegacyOutcome {
  const now = ctx.now ?? new Date();
  if (a.active === false) return { kind: "skip", reason: "inactive" };
  if (a.expiresAt && new Date(a.expiresAt) <= now) return { kind: "skip", reason: "expired" };
  if (NO_EQUIVALENT.has(a.role)) return { kind: "skip", reason: "no matrix equivalent" };
  if (a.scopeType === "global" || !a.scopeId) return { kind: "skip", reason: "not tied to a club or association" };

  const base = {
    status: "active" as const,
    ...(a.seasonYear ? { season: String(a.seasonYear) } : {}),
    ...(a.expiresAt ? { expiresAt: a.expiresAt } : {}),
    source: "legacy-migration" as const,
    legacyRole: a.role,
    migratedAt: now.toISOString(),
  };
  const make = (orgType: OrgType, orgId: string, slug: string, extra: Partial<RoleHolding> = {}): LegacyOutcome => {
    const roleKey = `${orgType}:${slug}`;
    if (!getMatrixRole(roleKey)) return { kind: "review", reason: `matrix role ${roleKey} not found` };
    return { kind: "holding", holding: { roleKey, orgType, orgId, ...extra, ...base } };
  };

  if (a.scopeType === "team") {
    const slug = TEAM_MAP[a.role];
    if (slug) {
      if (!ctx.teamClubId) return { kind: "review", reason: "team not found, cannot work out its club" };
      return make("club", ctx.teamClubId, slug, { teamIds: [a.scopeId] });
    }
    // Other roles held "at a team" belong to the club that owns the team.
    const clubSlug = CLUB_MAP[a.role];
    if (clubSlug && ctx.teamClubId) return make("club", ctx.teamClubId, clubSlug);
    return { kind: "review", reason: `team-level ${a.role} has no matrix equivalent` };
  }

  if (a.scopeType === "club") {
    if (NEEDS_CHOICE[a.role] && TEAM_MAP[a.role]) return { kind: "review", reason: NEEDS_CHOICE[a.role] };
    const slug = CLUB_MAP[a.role];
    if (slug) return make("club", a.scopeId, slug);
    return { kind: "review", reason: `${a.role} at a club has no matrix equivalent` };
  }

  if (a.scopeType === "association") {
    if (NEEDS_CHOICE[a.role]) return { kind: "review", reason: NEEDS_CHOICE[a.role] };
    const slug = ASSOC_MAP[a.role];
    if (slug) return make("association", a.scopeId, slug);
    if (a.role === "player" || a.role === "parent") return { kind: "skip", reason: "association-level player/parent is covered by the club role" };
    return { kind: "review", reason: `${a.role} at an association has no matrix equivalent` };
  }

  return { kind: "review", reason: `unknown scope type ${a.scopeType}` };
}

/** Same role, organisation and (for team roles) team set. */
export function holdingKey(h: Pick<RoleHolding, "roleKey" | "orgId" | "teamIds" | "season">): string {
  return `${h.roleKey}|${h.orgId}|${[...(h.teamIds ?? [])].sort().join(",")}|${h.season ?? ""}`;
}

export interface MemberPlan {
  add: MigratedHolding[];
  review: { assignment: LegacyAssignment; reason: string }[];
  skipped: { assignment: LegacyAssignment; reason: string }[];
  alreadyHeld: number;
}

/** Everything a member's legacy roles should add, leaving existing holdings alone. */
export function planMemberHoldings(
  assignments: LegacyAssignment[],
  existing: RoleHolding[],
  ctxFor: (a: LegacyAssignment) => LegacyContext,
): MemberPlan {
  const have = new Set(existing.map(holdingKey));
  const plan: MemberPlan = { add: [], review: [], skipped: [], alreadyHeld: 0 };
  for (const a of assignments) {
    const out = mapLegacyAssignment(a, ctxFor(a));
    if (out.kind === "skip") { plan.skipped.push({ assignment: a, reason: out.reason }); continue; }
    if (out.kind === "review") { plan.review.push({ assignment: a, reason: out.reason }); continue; }
    const k = holdingKey(out.holding);
    if (have.has(k)) { plan.alreadyHeld++; continue; }
    have.add(k);
    plan.add.push(out.holding);
  }
  return plan;
}

export interface HoldingEndPlan {
  /** Indexes into the member's roleHoldings that should be ended. */
  indexes: number[];
}

/**
 * When legacy roles are ended or removed, which matrix holdings go with them. Only holdings that were created
 * from a legacy role (source "legacy-migration") are touched, and only when no remaining legacy role still maps
 * to the same holding. Appointments made through the matrix flow are never ended here.
 */
export function planHoldingEnds(
  before: LegacyAssignment[],
  after: LegacyAssignment[],
  holdings: (RoleHolding & { source?: string })[],
  ctxFor: (a: LegacyAssignment) => LegacyContext,
  now: Date = new Date(),
): HoldingEndPlan {
  const keysOf = (list: LegacyAssignment[], at: Date) => {
    const keys = new Set<string>();
    for (const a of list) {
      const out = mapLegacyAssignment(a, { ...ctxFor(a), now: at });
      if (out.kind === "holding") keys.add(holdingKey(out.holding));
    }
    return keys;
  };
  // "before" is judged as it stood when it was granted, so an already-lapsed expiry doesn't hide it.
  const was = keysOf(before, new Date(0));
  const still = keysOf(after, now);
  const gone = new Set([...was].filter((k) => !still.has(k)));
  const indexes: number[] = [];
  holdings.forEach((h, i) => {
    if (h.source === "legacy-migration" && h.status !== "ended" && gone.has(holdingKey(h))) indexes.push(i);
  });
  return { indexes };
}
