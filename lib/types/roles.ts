// lib/types/roles.ts
// Role and permission type definitions.
// A user/member can hold MULTIPLE role assignments simultaneously, each scoped to a
// specific organisation (global, association, club, or team).
// e.g. Someone can be a player at CHC, a coach of CHC Under-16s, a selector at BHA,
// and a committee member of both CHC and BHA.

// ── Role types ────────────────────────────────────────────────────────────────

export type UserRole =
  // ── System ──────────────────────────────────────────────────────────────────
  | "super-admin"            // Full system access

  // ── Association level ────────────────────────────────────────────────────────
  | "association-admin"      // Manage their association and child clubs
  | "assoc-committee"        // Association management committee (governance)
  | "assoc-coach"            // Association-level coaching staff
  | "assoc-selector"         // Association-level selection committee
  | "assoc-registrar"        // Association registrations officer

  // ── Club level ───────────────────────────────────────────────────────────────
  | "club-admin"             // Manage their club, members, teams
  | "club-committee"         // Club management committee (governance, financials)
  | "coach"                  // Coach an assigned team/s
  | "manager"                // Team manager / administrator
  | "registrar"              // Club registrations officer
  | "umpire"                 // Match official

  // ── Volunteer / helper ────────────────────────────────────────────────────────
  | "volunteer"              // General club volunteer, basic read access

  // ── Member / portal roles ─────────────────────────────────────────────────────
  | "player"                 // Active player — portal, nominations, own profile
  | "member"                 // General member — own profile only
  | "parent"                 // Parent/guardian — manage children's registrations
  | "team-selector"          // Team-level selector (e.g., age-group convenor)

  // ── Public ────────────────────────────────────────────────────────────────────
  | "public";                // No account — uses name+DOB lookup only

// ── Scope of a role assignment ────────────────────────────────────────────────

export type ScopeType = "global" | "association" | "club" | "team";

/**
 * A single role assignment.
 * A person can have many of these, one per role-per-organisation.
 *
 * Example: John Smith could have:
 *   { role: "player",         scopeType: "club",        scopeId: "club-chc" }
 *   { role: "coach",          scopeType: "club",        scopeId: "club-chc", notes: "U16 Boys Head Coach" }
 *   { role: "assoc-selector", scopeType: "association", scopeId: "bha" }
 *   { role: "club-committee", scopeType: "club",        scopeId: "club-chc" }
 */
export interface RoleAssignment {
  role: UserRole;
  scopeType: ScopeType;
  scopeId?: string;       // associationId or clubId — omit for global/super-admin
  scopeName?: string;     // Human-readable scope name for display
  grantedAt: string;      // ISO date string
  grantedBy?: string;     // userId of the administrator who granted this
  expiresAt?: string;     // Optional — roles can have an expiry (seasonal coaching roles etc)
  notes?: string;         // Free-text context, e.g. "Under 16 Boys Head Coach"
  active?: boolean;       // Defaults to true; false = suspended/revoked
}

// ── Permissions ───────────────────────────────────────────────────────────────

export type Permission =
  // System
  | "system.manage" | "system.settings" | "system.users"

  // Association
  | "association.view" | "association.create" | "association.edit"
  | "association.delete" | "association.settings" | "association.fees"

  // Club
  | "club.view" | "club.create" | "club.edit" | "club.delete"
  | "club.settings" | "club.fees" | "club.members"

  // Member
  | "member.view" | "member.create" | "member.edit" | "member.delete"

  // Team
  | "team.view" | "team.create" | "team.edit" | "team.delete" | "team.roster"

  // Registration
  | "registration.view" | "registration.approve" | "registration.manage"
  | "registration.payments"

  // Reports / financials
  | "reports.view" | "reports.financial" | "reports.export"

  // Selection / nominations
  | "selection.view" | "selection.nominate" | "selection.vote" | "selection.manage"

  // Profile
  | "profile.view" | "profile.edit";

// ── Role definition (metadata + permissions) ──────────────────────────────────

export interface RoleDefinition {
  role: UserRole;
  label: string;
  description: string;
  scopeTypes: ScopeType[];      // Which scope types this role can be assigned at
  permissions: Permission[];
  color: string;
  icon: string;
  adminAccess: boolean;         // Whether this role grants any admin area access
}

export const ROLE_DEFINITIONS: Record<UserRole, RoleDefinition> = {

  // ── System ──────────────────────────────────────────────────────────────────
  "super-admin": {
    role: "super-admin",
    label: "Super Administrator",
    description: "Full system access — can manage everything across all organisations",
    scopeTypes: ["global"],
    permissions: [
      "system.manage", "system.settings", "system.users",
      "association.view", "association.create", "association.edit",
      "association.delete", "association.settings", "association.fees",
      "club.view", "club.create", "club.edit", "club.delete",
      "club.settings", "club.fees", "club.members",
      "member.view", "member.create", "member.edit", "member.delete",
      "team.view", "team.create", "team.edit", "team.delete", "team.roster",
      "registration.view", "registration.approve", "registration.manage",
      "registration.payments",
      "reports.view", "reports.financial", "reports.export",
      "selection.view", "selection.nominate", "selection.vote", "selection.manage",
      "profile.view", "profile.edit",
    ],
    color: "from-purple-500 to-purple-700",
    icon: "👑",
    adminAccess: true,
  },

  // ── Association level ────────────────────────────────────────────────────────
  "association-admin": {
    role: "association-admin",
    label: "Association Administrator",
    description: "Manage their association, child clubs, members, and teams",
    scopeTypes: ["association"],
    permissions: [
      "association.view", "association.edit", "association.settings",
      "association.fees",
      "club.view", "club.create", "club.edit", "club.settings",
      "club.fees", "club.members",
      "member.view", "member.create", "member.edit",
      "team.view", "team.create", "team.edit",
      "registration.view", "registration.approve", "registration.manage",
      "registration.payments",
      "reports.view", "reports.financial", "reports.export",
      "selection.view", "selection.manage",
      "profile.view",
    ],
    color: "from-blue-500 to-blue-700",
    icon: "🏛️",
    adminAccess: true,
  },

  "assoc-committee": {
    role: "assoc-committee",
    label: "Association Committee Member",
    description: "Association management committee — governance, financials, policy",
    scopeTypes: ["association"],
    permissions: [
      "association.view", "association.settings", "association.fees",
      "club.view",
      "member.view",
      "team.view",
      "reports.view", "reports.financial", "reports.export",
      "selection.view",
      "profile.view",
    ],
    color: "from-sky-500 to-sky-700",
    icon: "🏛",
    adminAccess: true,
  },

  "assoc-coach": {
    role: "assoc-coach",
    label: "Association Coach",
    description: "Association-level coaching staff — views all nominations and rosters",
    scopeTypes: ["association"],
    permissions: [
      "association.view",
      "club.view",
      "member.view",
      "team.view", "team.roster",
      "selection.view", "selection.nominate",
      "reports.view",
      "profile.view",
    ],
    color: "from-amber-500 to-amber-700",
    icon: "🎽",
    adminAccess: true,
  },

  "assoc-selector": {
    role: "assoc-selector",
    label: "Association Selector",
    description: "Association-level selection committee — manages rep team selection",
    scopeTypes: ["association"],
    permissions: [
      "association.view",
      "club.view",
      "member.view",
      "team.view", "team.create", "team.edit", "team.roster",
      "selection.view", "selection.nominate", "selection.vote", "selection.manage",
      "reports.view",
      "profile.view",
    ],
    color: "from-violet-500 to-violet-700",
    icon: "🗂️",
    adminAccess: true,
  },

  "assoc-registrar": {
    role: "assoc-registrar",
    label: "Association Registrar",
    description: "Handles member registrations and transfers at association level",
    scopeTypes: ["association"],
    permissions: [
      "association.view",
      "club.view", "club.members",
      "member.view", "member.create", "member.edit",
      "registration.view", "registration.approve", "registration.manage",
      "registration.payments",
      "reports.view",
      "profile.view",
    ],
    color: "from-teal-500 to-teal-700",
    icon: "📋",
    adminAccess: true,
  },

  // ── Club level ───────────────────────────────────────────────────────────────
  "club-admin": {
    role: "club-admin",
    label: "Club Administrator",
    description: "Manage their club, members, teams, and registrations",
    scopeTypes: ["club"],
    permissions: [
      "club.view", "club.edit", "club.settings", "club.fees", "club.members",
      "member.view", "member.create", "member.edit",
      "team.view", "team.create", "team.edit", "team.roster",
      "registration.view", "registration.approve",
      "reports.view",
      "selection.view", "selection.nominate",
      "profile.view",
    ],
    color: "from-green-500 to-green-700",
    icon: "🏢",
    adminAccess: true,
  },

  "club-committee": {
    role: "club-committee",
    label: "Club Committee Member",
    description: "Club management committee — governance, meetings, club financials",
    scopeTypes: ["club"],
    permissions: [
      "club.view", "club.settings", "club.fees",
      "member.view",
      "team.view",
      "registration.view",
      "reports.view", "reports.financial",
      "selection.view",
      "profile.view",
    ],
    color: "from-emerald-500 to-emerald-700",
    icon: "🤝",
    adminAccess: true,
  },

  "coach": {
    role: "coach",
    label: "Coach",
    description: "Can manage assigned teams and view their players",
    scopeTypes: ["club", "team"],
    permissions: [
      "club.view",
      "member.view",
      "team.view", "team.roster",
      "selection.view", "selection.nominate",
      "reports.view",
      "profile.view",
    ],
    color: "from-yellow-500 to-yellow-700",
    icon: "🏃",
    adminAccess: true,
  },

  "manager": {
    role: "manager",
    label: "Team Manager",
    description: "Team administration, logistics, and communications",
    scopeTypes: ["club", "team"],
    permissions: [
      "club.view",
      "member.view",
      "team.view", "team.roster",
      "registration.view",
      "reports.view",
      "profile.view",
    ],
    color: "from-orange-500 to-orange-700",
    icon: "📋",
    adminAccess: true,
  },

  "registrar": {
    role: "registrar",
    label: "Club Registrar",
    description: "Handles member registrations, transfers, and payments at club level",
    scopeTypes: ["club"],
    permissions: [
      "club.view", "club.members",
      "member.view", "member.create", "member.edit",
      "registration.view", "registration.approve", "registration.manage",
      "registration.payments",
      "reports.view",
      "profile.view",
    ],
    color: "from-cyan-500 to-cyan-700",
    icon: "📝",
    adminAccess: true,
  },

  "umpire": {
    role: "umpire",
    label: "Umpire / Official",
    description: "Match officials — limited read access to fixtures and teams",
    scopeTypes: ["club", "association"],
    permissions: ["club.view", "team.view", "member.view", "profile.view"],
    color: "from-slate-500 to-slate-700",
    icon: "🎯",
    adminAccess: false,
  },

  "volunteer": {
    role: "volunteer",
    label: "Volunteer",
    description: "General club volunteer with basic read access",
    scopeTypes: ["club"],
    permissions: ["club.view", "team.view", "member.view", "profile.view"],
    color: "from-cyan-400 to-cyan-600",
    icon: "🙋",
    adminAccess: false,
  },

  "team-selector": {
    role: "team-selector",
    label: "Team Selector",
    description: "Age-group / division convenor — can view nominations and select squads",
    scopeTypes: ["club", "association", "team"],
    permissions: [
      "club.view",
      "member.view",
      "team.view", "team.roster",
      "selection.view", "selection.manage",
      "profile.view",
    ],
    color: "from-teal-500 to-teal-700",
    icon: "🏅",
    adminAccess: true,
  },

  // ── Member / portal ──────────────────────────────────────────────────────────
  "player": {
    role: "player",
    label: "Player",
    description: "Active player — can nominate for representative teams and view own profile",
    scopeTypes: ["club"],
    permissions: ["profile.view", "profile.edit", "selection.nominate", "team.view"],
    color: "from-indigo-500 to-indigo-600",
    icon: "🏑",
    adminAccess: false,
  },

  "member": {
    role: "member",
    label: "Member",
    description: "General member — can view and edit own profile only",
    scopeTypes: ["club"],
    permissions: ["profile.view", "profile.edit", "team.view"],
    color: "from-slate-400 to-slate-600",
    icon: "⭐",
    adminAccess: false,
  },

  "parent": {
    role: "parent",
    label: "Parent / Guardian",
    description: "Can manage children's registrations and view their progress",
    scopeTypes: ["club"],
    permissions: ["member.view", "registration.view", "team.view", "profile.view", "profile.edit"],
    color: "from-pink-500 to-pink-700",
    icon: "👨‍👩‍👧‍👦",
    adminAccess: false,
  },

  // ── Public ────────────────────────────────────────────────────────────────────
  "public": {
    role: "public",
    label: "Public",
    description: "No account — uses name+DOB lookup for nominations only",
    scopeTypes: ["global"],
    permissions: [],
    color: "from-gray-400 to-gray-500",
    icon: "🌐",
    adminAccess: false,
  },
};

// ── Role group labels (for UI grouping) ───────────────────────────────────────

export const ROLE_GROUPS = {
  "System": ["super-admin"],
  "Association": ["association-admin", "assoc-committee", "assoc-coach", "assoc-selector", "assoc-registrar"],
  "Club": ["club-admin", "club-committee", "coach", "manager", "registrar", "umpire", "volunteer", "team-selector"],
  "Member Portal": ["player", "member", "parent"],
  "Public": ["public"],
} as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

export function getRoleDefinition(role: UserRole): RoleDefinition {
  return ROLE_DEFINITIONS[role];
}

export function getRoleLabel(role: UserRole): string {
  return ROLE_DEFINITIONS[role]?.label ?? role;
}

/** Returns true if the role grants any admin-area access */
export function isAdminRole(role: UserRole): boolean {
  return ROLE_DEFINITIONS[role]?.adminAccess === true;
}

/** Check if a single role has a specific permission */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_DEFINITIONS[role]?.permissions.includes(permission) ?? false;
}

/**
 * Compute the effective (union) set of permissions from an array of role assignments.
 * Ignores expired or inactive assignments.
 * Optionally filter by scope — e.g., only consider roles scoped to a specific club.
 */
export function getEffectivePermissions(
  assignments: RoleAssignment[],
  scopeFilter?: { scopeType?: ScopeType; scopeId?: string },
): Set<Permission> {
  const now = new Date();
  const perms = new Set<Permission>();

  for (const assignment of assignments) {
    // Skip inactive or expired
    if (assignment.active === false) continue;
    if (assignment.expiresAt && new Date(assignment.expiresAt) < now) continue;

    // Apply scope filter if provided
    if (scopeFilter) {
      if (scopeFilter.scopeType && assignment.scopeType !== "global" && assignment.scopeType !== scopeFilter.scopeType) continue;
      if (scopeFilter.scopeId && assignment.scopeId && assignment.scopeId !== scopeFilter.scopeId) continue;
    }

    const def = ROLE_DEFINITIONS[assignment.role];
    if (def) def.permissions.forEach((p) => perms.add(p));
  }

  return perms;
}

/**
 * Check if a user (via their role assignments) has a specific permission,
 * optionally scoped to a specific organisation.
 */
export function hasEffectivePermission(
  assignments: RoleAssignment[],
  permission: Permission,
  scopeFilter?: { scopeType?: ScopeType; scopeId?: string },
): boolean {
  return getEffectivePermissions(assignments, scopeFilter).has(permission);
}

/**
 * Get the "primary" (highest-privilege) role from an array of assignments.
 * Used for redirect decisions and display.
 */
const ROLE_PRIORITY: UserRole[] = [
  "super-admin",
  "association-admin", "assoc-committee", "assoc-coach", "assoc-selector", "assoc-registrar",
  "club-admin", "club-committee", "coach", "manager", "registrar", "team-selector",
  "umpire", "volunteer",
  "player", "member", "parent",
  "public",
];

export function getPrimaryRole(assignments: RoleAssignment[]): UserRole {
  const activeRoles = assignments
    .filter((a) => a.active !== false)
    .filter((a) => !a.expiresAt || new Date(a.expiresAt) > new Date())
    .map((a) => a.role);

  for (const role of ROLE_PRIORITY) {
    if (activeRoles.includes(role)) return role;
  }
  return "public";
}

/**
 * Does the user have admin access to ANY scope?
 * (i.e., do any of their active assignments carry adminAccess=true?)
 */
export function hasAnyAdminAccess(assignments: RoleAssignment[]): boolean {
  return assignments
    .filter((a) => a.active !== false)
    .some((a) => ROLE_DEFINITIONS[a.role]?.adminAccess);
}

/**
 * Backward-compat helper: convert a single role string to a synthetic RoleAssignment array.
 * Used when reading legacy user documents that only have `role: string`.
 */
export function roleStringToAssignments(
  role: string,
  scopeId?: string,
  scopeType: ScopeType = "global",
): RoleAssignment[] {
  const validRole = (role as UserRole) in ROLE_DEFINITIONS ? (role as UserRole) : "member";
  return [{
    role: validRole,
    scopeType,
    scopeId,
    grantedAt: new Date().toISOString(),
    active: true,
  }];
}

export function canAccessResource(
  assignments: RoleAssignment[],
  resourceType: "association" | "club",
  resourceId: string,
): boolean {
  const now = new Date();
  for (const a of assignments) {
    if (a.active === false) continue;
    if (a.expiresAt && new Date(a.expiresAt) < now) continue;
    if (a.role === "super-admin") return true;
    if (a.scopeType === "global") return true;
    if (resourceType === "association" && a.scopeType === "association" && a.scopeId === resourceId) return true;
    if (resourceType === "club" && a.scopeType === "club" && a.scopeId === resourceId) return true;
  }
  return false;
}
