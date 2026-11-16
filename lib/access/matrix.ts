// lib/access/matrix.ts
// Roles & Access Matrix engine.
//
// Rules (from the matrix's "Read me" tab):
//  • Each role has an access code per AREA: — none · V view public · O own records · R read · E edit · A admin/approve.
//  • A person holding several roles gets the HIGHEST code per area across the roles active in the context
//    they have selected. The context is an organisation (a club or an association) or "personal".
//  • Codes apply within the role's SCOPE (Self, Self + children, Team, Age group / Program, Assigned matches,
//    Club, Own club, Rep squad, Association).
//  • A role marked Blue Card only becomes active when the holder has a valid Blue Card / WWC check.
//  • Nobody gets a role silently: holdings are created when the person accepts an appointment.

import type { UserRole } from "@/lib/types/roles";
import { CLUB_MATRIX, ASSOC_MATRIX, type MatrixRow } from "@/lib/access/matrixData";

export type AccessCode = "-" | "V" | "O" | "R" | "E" | "A";
export type OrgType = "club" | "association";

/** Order from the matrix legend: the "highest" code wins. */
export const CODE_RANK: Record<AccessCode, number> = { "-": 0, V: 1, O: 2, R: 3, E: 4, A: 5 };

export interface AreaDef { key: string; label: string }

/** Column order of the Club tab. */
export const CLUB_AREAS: AreaDef[] = [
  { key: "clubSettings", label: "Club Settings" },
  { key: "committeeGovernance", label: "Committee & Governance" },
  { key: "membersRegistrations", label: "Members & Registrations" },
  { key: "ownProfile", label: "Own Profile" },
  { key: "financeFees", label: "Finance & Fees" },
  { key: "teamsSquads", label: "Teams & Squads" },
  { key: "fixturesResults", label: "Fixtures & Results" },
  { key: "availabilitySelection", label: "Availability & Selection" },
  { key: "trainingCoaching", label: "Training & Coaching" },
  { key: "medicalInjury", label: "Medical & Injury" },
  { key: "childSafetyIncidents", label: "Child Safety & Incidents" },
  { key: "volunteersRosters", label: "Volunteers & Rosters" },
  { key: "facilitiesEquipment", label: "Facilities & Equipment" },
  { key: "canteenBar", label: "Canteen & Bar" },
  { key: "sponsorshipFundraising", label: "Sponsorship & Fundraising" },
  { key: "commsMedia", label: "Comms & Media" },
  { key: "merchandiseUniforms", label: "Merchandise & Uniforms" },
  { key: "reportsExports", label: "Reports & Exports" },
  { key: "usersRoles", label: "Users & Roles" },
];

/** Column order of the Association tab. */
export const ASSOC_AREAS: AreaDef[] = [
  { key: "orgSettings", label: "Org Settings & Constitution" },
  { key: "boardGovernance", label: "Board & Governance" },
  { key: "affiliatedClubs", label: "Affiliated Clubs" },
  { key: "memberRegistry", label: "Member Registry" },
  { key: "ownProfile", label: "Own Profile" },
  { key: "financeFeesLevies", label: "Finance, Fees & Levies" },
  { key: "competitionsGrading", label: "Competitions & Grading" },
  { key: "fixturesResults", label: "Fixtures & Results" },
  { key: "officialsAppointments", label: "Officials & Appointments" },
  { key: "coachAccreditation", label: "Coach Accreditation & Education" },
  { key: "pathwaysRepTeams", label: "Pathways & Rep Teams" },
  { key: "medicalInjury", label: "Medical & Injury" },
  { key: "integrityChildSafety", label: "Integrity, Child Safety & Complaints" },
  { key: "tribunalDiscipline", label: "Tribunal & Discipline" },
  { key: "venuesEvents", label: "Venues & Events" },
  { key: "sponsorshipCommercial", label: "Sponsorship & Commercial" },
  { key: "commsMedia", label: "Comms & Media" },
  { key: "reportsExports", label: "Reports & Exports" },
  { key: "usersRoles", label: "Users & Roles" },
];

export const AREAS: Record<OrgType, AreaDef[]> = { club: CLUB_AREAS, association: ASSOC_AREAS };

export type ScopeKind =
  | "public" | "self" | "selfChildren" | "team" | "ageGroup" | "assignedMatches"
  | "club" | "ownClub" | "repSquad" | "association";

const SCOPE_KIND: Record<string, ScopeKind> = {
  "Public": "public",
  "Self": "self",
  "Self + children": "selfChildren",
  "Team": "team",
  "Age group / Program": "ageGroup",
  "Assigned matches": "assignedMatches",
  "Club": "club",
  "Own club": "ownClub",
  "Rep squad": "repSquad",
  "Association": "association",
};

export interface MatrixRole {
  /** Stable key, e.g. "club:head-coach", "association:referee-coordinator-appointments-officer". */
  key: string;
  orgType: OrgType;
  category: string;
  name: string;
  /** 0 public … 6 system admin (L0–L6). */
  level: number;
  scope: ScopeKind;
  blueCardRequired: boolean;
  access: Record<string, AccessCode>;
}

export function slugifyRole(name: string): string {
  return name.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function build(orgType: OrgType, rows: MatrixRow[]): MatrixRole[] {
  const areas = AREAS[orgType];
  return rows.map(([category, name, level, scope, blueCard, codes]) => {
    if (codes.length !== areas.length) throw new Error(`Access matrix: "${name}" has ${codes.length} codes, expected ${areas.length}`);
    const access: Record<string, AccessCode> = {};
    areas.forEach((a, i) => { access[a.key] = codes[i] as AccessCode; });
    return {
      key: `${orgType}:${slugifyRole(name)}`,
      orgType, category, name, level,
      scope: SCOPE_KIND[scope] ?? "self",
      blueCardRequired: blueCard,
      access,
    };
  });
}

export const MATRIX_ROLES: MatrixRole[] = [...build("club", CLUB_MATRIX), ...build("association", ASSOC_MATRIX)];
const BY_KEY = new Map(MATRIX_ROLES.map((r) => [r.key, r]));

export function getMatrixRole(key: string): MatrixRole | undefined {
  return BY_KEY.get(key);
}
export function rolesForOrg(orgType: OrgType): MatrixRole[] {
  return MATRIX_ROLES.filter((r) => r.orgType === orgType);
}

// ── Holdings & context ───────────────────────────────────────────────────────

/** A role a person holds (created when they accept an appointment). Stored on the member as `roleHoldings`. */
export interface RoleHolding {
  roleKey: string;
  orgType: OrgType;
  /** clubId or associationId. */
  orgId: string;
  /** Team / age group / rep squad / fixture ids that narrow the scope (when the scope kind needs them). */
  teamIds?: string[];
  ageGroups?: string[];
  repSquadIds?: string[];
  fixtureIds?: string[];
  /** Season this appointment is for, e.g. "2026". */
  season?: string;
  status?: "active" | "pending" | "ended";
  expiresAt?: string;
}

export type AccessContext = { kind: "personal" } | { kind: "org"; orgType: OrgType; orgId: string };

export interface InactiveHolding { roleKey: string; reason: "unknown-role" | "blue-card" | "not-active" | "expired" }

export interface ResolvedAccess {
  context: AccessContext;
  /** Highest code per area key (only areas that exist for the context's org type). */
  areas: Record<string, AccessCode>;
  /** The roles that contributed (active holdings in this context). */
  roles: { role: MatrixRole; holding: RoleHolding }[];
  inactive: InactiveHolding[];
  /** Highest level (L0–L6) among active roles. */
  level: number;
}

export interface ResolveOptions {
  /** Holder has a valid Blue Card / WWC check. Roles that require it stay inactive otherwise. */
  blueCardValid?: boolean;
  now?: Date;
}

function emptyAreas(orgType: OrgType): Record<string, AccessCode> {
  return Object.fromEntries(AREAS[orgType].map((a) => [a.key, "-" as AccessCode]));
}

export function higherCode(a: AccessCode, b: AccessCode): AccessCode {
  return CODE_RANK[b] > CODE_RANK[a] ? b : a;
}

/** The personal context is always available: own profile (and linked children). */
const PERSONAL_AREAS: Record<string, AccessCode> = { ownProfile: "O" };

export function resolveAccess(holdings: RoleHolding[], context: AccessContext, opts: ResolveOptions = {}): ResolvedAccess {
  const now = opts.now ?? new Date();
  if (context.kind === "personal") {
    return { context, areas: { ...PERSONAL_AREAS }, roles: [], inactive: [], level: 1 };
  }

  const areas = emptyAreas(context.orgType);
  const roles: ResolvedAccess["roles"] = [];
  const inactive: InactiveHolding[] = [];

  for (const h of holdings) {
    if (h.orgType !== context.orgType || h.orgId !== context.orgId) continue;
    const role = getMatrixRole(h.roleKey);
    if (!role || role.orgType !== context.orgType) { inactive.push({ roleKey: h.roleKey, reason: "unknown-role" }); continue; }
    if (h.status && h.status !== "active") { inactive.push({ roleKey: h.roleKey, reason: "not-active" }); continue; }
    if (h.expiresAt && new Date(h.expiresAt) <= now) { inactive.push({ roleKey: h.roleKey, reason: "expired" }); continue; }
    if (role.blueCardRequired && !opts.blueCardValid) { inactive.push({ roleKey: h.roleKey, reason: "blue-card" }); continue; }
    roles.push({ role, holding: h });
    for (const [area, code] of Object.entries(role.access)) areas[area] = higherCode(areas[area] ?? "-", code);
  }

  // Everyone signed in can at least see their own profile and public information.
  areas.ownProfile = higherCode(areas.ownProfile ?? "-", "O");
  const level = roles.reduce((m, r) => Math.max(m, r.role.level), 1);
  return { context, areas, roles, inactive, level };
}

// ── Capability helpers ───────────────────────────────────────────────────────

export const codeAtLeast = (code: AccessCode | undefined, min: AccessCode) => CODE_RANK[code ?? "-"] >= CODE_RANK[min];
/** Area appears in the menu / is not hidden. */
export const canSee = (c?: AccessCode) => (c ?? "-") !== "-";
/** May edit their own records in this area (O, E, A). */
export const canEditOwn = (c?: AccessCode) => c === "O" || c === "E" || c === "A";
/** May read everything in the area within scope (R, E, A). */
export const canReadAll = (c?: AccessCode) => c === "R" || c === "E" || c === "A";
/** May create/update within scope (E, A). */
export const canEdit = (c?: AccessCode) => c === "E" || c === "A";
/** May delete, approve, assign others, bulk export (A). */
export const canAdmin = (c?: AccessCode) => c === "A";

/** What a page should do for this code. */
export type AccessMode = "hidden" | "public" | "own" | "read" | "edit" | "admin";
export function accessMode(c?: AccessCode): AccessMode {
  switch (c) {
    case "V": return "public";
    case "O": return "own";
    case "R": return "read";
    case "E": return "edit";
    case "A": return "admin";
    default: return "hidden";
  }
}

// ── Scope ────────────────────────────────────────────────────────────────────

export interface ScopeTarget {
  /** The record's owner (for Self scopes). */
  memberId?: string;
  /** The signed-in person and their linked children. */
  selfMemberId?: string;
  childMemberIds?: string[];
  clubId?: string;
  associationId?: string;
  teamId?: string;
  ageGroup?: string;
  repSquadId?: string;
  fixtureId?: string;
}

/** Does this holding's scope cover the target record? (Org match is checked by resolveAccess.) */
export function scopeCovers(role: MatrixRole, h: RoleHolding, t: ScopeTarget): boolean {
  switch (role.scope) {
    case "public": return true;
    case "self": return !!t.selfMemberId && t.memberId === t.selfMemberId;
    case "selfChildren":
      return !!t.memberId && (t.memberId === t.selfMemberId || (t.childMemberIds ?? []).includes(t.memberId));
    case "team": return !!t.teamId && (h.teamIds ?? []).includes(t.teamId);
    case "ageGroup": return !!t.ageGroup && (h.ageGroups ?? []).includes(t.ageGroup);
    case "assignedMatches": return !!t.fixtureId && (h.fixtureIds ?? []).includes(t.fixtureId);
    case "repSquad": return !!t.repSquadId && (h.repSquadIds ?? []).includes(t.repSquadId);
    case "club":
    case "ownClub": return !t.clubId || t.clubId === h.orgId;
    case "association": return !t.associationId || t.associationId === h.orgId;
  }
}

// ── Compatibility with the existing (coarse) roles ───────────────────────────
// Existing routes, menus and APIs are keyed on ~20 coarse roles. Until each page moves to area codes, every
// matrix role also maps to the closest coarse role so nothing has to change at once.

const CLUB_LEGACY: Record<string, UserRole> = {
  "president": "club-admin", "vice-president": "club-admin", "secretary": "club-admin",
  "club-manager-administrator": "club-admin", "website-it-administrator": "club-admin",
  "treasurer": "club-committee", "public-officer": "club-committee", "general-committee-member": "club-committee",
  "registrar-membership-secretary": "registrar",
  "director-of-coaching": "coach", "head-coach": "coach", "assistant-coach": "coach", "specialist-coach": "coach",
  "junior-coordinator": "coach", "senior-coordinator": "coach", "age-group-coordinator": "coach",
  "selector": "team-selector",
  "team-manager": "manager",
  "club-umpire-referee": "umpire", "boundary-line-umpire": "umpire",
  "scorer": "technical-official", "timekeeper": "technical-official",
  "player": "player", "captain-vice-captain": "player",
  "parent-guardian": "parent",
};
const ASSOC_LEGACY: Record<string, UserRole> = {
  "president-chair": "association-admin", "vice-president-deputy-chair": "association-admin",
  "secretary": "association-admin", "ceo-general-manager": "association-admin", "operations-manager": "association-admin",
  "website-administrator": "association-admin",
  "treasurer": "assoc-committee", "public-officer": "assoc-committee", "board-director": "assoc-committee",
  "independent-director": "assoc-committee", "club-delegate": "assoc-committee",
  "registrar-membership-officer": "assoc-registrar",
  "competition-manager": "assoc-competition", "fixtures-secretary": "assoc-competition", "grading-coordinator": "assoc-competition",
  "technical-director-director-of-coaching": "assoc-coach", "coach-development-officer": "assoc-coach",
  "rep-team-head-coach": "assoc-coach", "rep-team-assistant-coach": "assoc-coach",
  "selector-chair-of-selectors": "assoc-selector", "pathways-talent-coordinator": "assoc-selector",
  "referee-umpire": "umpire", "assistant-referee-line-umpire": "umpire", "referee-coordinator-appointments-officer": "umpire",
  "technical-official-judge": "technical-official",
  "communications-media-officer": "media-marketing", "marketing-manager": "media-marketing", "social-media-manager": "media-marketing",
  "player": "player", "parent-guardian": "parent",
  "club-administrator-club-secretary": "club-admin", "club-registrar": "registrar",
};

/** Closest coarse role for a matrix role (transitional). Roles with no admin-area need map to member/volunteer. */
export function legacyRoleFor(role: MatrixRole): UserRole {
  const slug = role.key.slice(role.key.indexOf(":") + 1);
  const mapped = (role.orgType === "club" ? CLUB_LEGACY : ASSOC_LEGACY)[slug];
  if (mapped) return mapped;
  if (role.level >= 6) return role.orgType === "club" ? "club-admin" : "association-admin";
  if (role.level >= 3) return "volunteer";
  return "member";
}

/** Active holdings expressed as coarse role assignments, for the existing session/persona machinery. */
export function legacyAssignmentsFor(holdings: RoleHolding[], opts: ResolveOptions = {}) {
  const now = opts.now ?? new Date();
  const out: { role: UserRole; scopeType: "club" | "association"; scopeId: string; grantedAt: string; seasonYear?: string }[] = [];
  const seen = new Set<string>();
  for (const h of holdings) {
    const role = getMatrixRole(h.roleKey);
    if (!role || (h.status && h.status !== "active")) continue;
    if (h.expiresAt && new Date(h.expiresAt) <= now) continue;
    if (role.blueCardRequired && !opts.blueCardValid) continue;
    const legacy = legacyRoleFor(role);
    const k = `${legacy}|${h.orgType}|${h.orgId}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push({ role: legacy, scopeType: h.orgType, scopeId: h.orgId, grantedAt: "", ...(h.season ? { seasonYear: h.season } : {}) });
  }
  return out;
}

/** Organisations a person can pick after login (one entry per club/association they hold an active role in). */
export function contextOptions(holdings: RoleHolding[], opts: ResolveOptions = {}): { orgType: OrgType; orgId: string; roleNames: string[] }[] {
  const map = new Map<string, { orgType: OrgType; orgId: string; roleNames: string[] }>();
  for (const h of holdings) {
    const res = resolveAccess([h], { kind: "org", orgType: h.orgType, orgId: h.orgId }, opts);
    if (res.roles.length === 0) continue;
    const k = `${h.orgType}|${h.orgId}`;
    const e = map.get(k) ?? { orgType: h.orgType, orgId: h.orgId, roleNames: [] };
    e.roleNames.push(res.roles[0].role.name);
    map.set(k, e);
  }
  return [...map.values()];
}
