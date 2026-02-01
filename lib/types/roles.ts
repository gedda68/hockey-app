// lib/types/roles.ts
// User roles and permissions type definitions

export type UserRole =
  | "super-admin"
  | "association-admin"
  | "club-admin"
  | "coach"
  | "manager"
  | "umpire"
  | "volunteer"
  | "member"
  | "parent";

export type Permission =
  // System permissions
  | "system.manage"
  | "system.settings"
  | "system.users"

  // Association permissions
  | "association.view"
  | "association.create"
  | "association.edit"
  | "association.delete"
  | "association.settings"
  | "association.fees"

  // Club permissions
  | "club.view"
  | "club.create"
  | "club.edit"
  | "club.delete"
  | "club.settings"
  | "club.fees"
  | "club.members"

  // Member permissions
  | "member.view"
  | "member.create"
  | "member.edit"
  | "member.delete"

  // Team permissions
  | "team.view"
  | "team.create"
  | "team.edit"
  | "team.delete"
  | "team.roster"

  // Registration permissions
  | "registration.view"
  | "registration.approve"
  | "registration.manage"
  | "registration.payments"

  // Reports permissions
  | "reports.view"
  | "reports.financial"
  | "reports.export"

  // Selection permissions
  | "selection.view"
  | "selection.nominate"
  | "selection.vote"
  | "selection.manage";

export interface RoleDefinition {
  role: UserRole;
  label: string;
  description: string;
  permissions: Permission[];
  color: string;
  icon: string;
}

export const ROLE_DEFINITIONS: Record<UserRole, RoleDefinition> = {
  "super-admin": {
    role: "super-admin",
    label: "Super Administrator",
    description: "Full system access - can manage everything",
    permissions: [
      "system.manage",
      "system.settings",
      "system.users",
      "association.view",
      "association.create",
      "association.edit",
      "association.delete",
      "association.settings",
      "association.fees",
      "club.view",
      "club.create",
      "club.edit",
      "club.delete",
      "club.settings",
      "club.fees",
      "club.members",
      "member.view",
      "member.create",
      "member.edit",
      "member.delete",
      "team.view",
      "team.create",
      "team.edit",
      "team.delete",
      "team.roster",
      "registration.view",
      "registration.approve",
      "registration.manage",
      "registration.payments",
      "reports.view",
      "reports.financial",
      "reports.export",
      "selection.view",
      "selection.nominate",
      "selection.vote",
      "selection.manage",
    ],
    color: "from-purple-500 to-purple-700",
    icon: "👑",
  },

  "association-admin": {
    role: "association-admin",
    label: "Association Administrator",
    description: "Can manage their association and child clubs",
    permissions: [
      "association.view",
      "association.edit",
      "association.settings",
      "association.fees",
      "club.view",
      "club.create",
      "club.edit",
      "club.settings",
      "club.fees",
      "club.members",
      "member.view",
      "member.create",
      "member.edit",
      "team.view",
      "team.create",
      "team.edit",
      "registration.view",
      "registration.approve",
      "registration.manage",
      "registration.payments",
      "reports.view",
      "reports.financial",
      "reports.export",
      "selection.view",
      "selection.manage",
    ],
    color: "from-blue-500 to-blue-700",
    icon: "🏛️",
  },

  "club-admin": {
    role: "club-admin",
    label: "Club Administrator",
    description: "Can manage their club, members, and teams",
    permissions: [
      "club.view",
      "club.edit",
      "club.settings",
      "club.fees",
      "club.members",
      "member.view",
      "member.create",
      "member.edit",
      "team.view",
      "team.create",
      "team.edit",
      "team.roster",
      "registration.view",
      "registration.approve",
      "reports.view",
      "selection.view",
      "selection.nominate",
    ],
    color: "from-green-500 to-green-700",
    icon: "🏢",
  },

  coach: {
    role: "coach",
    label: "Coach",
    description: "Can manage assigned teams and players",
    permissions: [
      "team.view",
      "team.roster",
      "member.view",
      "selection.view",
      "selection.nominate",
      "reports.view",
    ],
    color: "from-yellow-500 to-yellow-700",
    icon: "🏃",
  },

  manager: {
    role: "manager",
    label: "Team Manager",
    description: "Can assist with team administration",
    permissions: [
      "team.view",
      "team.roster",
      "member.view",
      "registration.view",
      "reports.view",
    ],
    color: "from-orange-500 to-orange-700",
    icon: "📋",
  },

  umpire: {
    role: "umpire",
    label: "Umpire / Official",
    description: "Match officials with limited access",
    permissions: ["team.view", "member.view"],
    color: "from-slate-500 to-slate-700",
    icon: "🎯",
  },

  volunteer: {
    role: "volunteer",
    label: "Volunteer",
    description: "Club volunteers with basic access",
    permissions: ["club.view", "team.view", "member.view"],
    color: "from-cyan-500 to-cyan-700",
    icon: "🤝",
  },

  member: {
    role: "member",
    label: "Member / Player",
    description: "Can view own information",
    permissions: ["member.view", "team.view"],
    color: "from-indigo-500 to-indigo-700",
    icon: "⭐",
  },

  parent: {
    role: "parent",
    label: "Parent / Guardian",
    description: "Can manage children's registrations",
    permissions: ["member.view", "registration.view", "team.view"],
    color: "from-pink-500 to-pink-700",
    icon: "👨‍👩‍👧‍👦",
  },
};

// Helper to get role definition
export function getRoleDefinition(role: UserRole): RoleDefinition {
  return ROLE_DEFINITIONS[role];
}

// Helper to check if role has permission
export function hasPermission(role: UserRole, permission: Permission): boolean {
  const roleDefinition = ROLE_DEFINITIONS[role];
  return roleDefinition.permissions.includes(permission);
}

// Helper to check if role can access resource
export function canAccessResource(
  userRole: UserRole,
  userAssociationId: string | null,
  userClubId: string | null,
  resourceType: "association" | "club",
  resourceId: string
): boolean {
  // Super admin can access everything
  if (userRole === "super-admin") return true;

  // Association admin can access their association and child clubs
  if (userRole === "association-admin") {
    if (resourceType === "association") {
      return userAssociationId === resourceId;
    }
    // For clubs, need to check if club belongs to their association
    // This will be done in the actual check
    return true; // Will be validated in middleware
  }

  // Club admin can only access their club
  if (userRole === "club-admin") {
    if (resourceType === "club") {
      return userClubId === resourceId;
    }
    // Can view parent association (read-only)
    if (resourceType === "association") {
      return userAssociationId === resourceId;
    }
  }

  return false;
}

// Get allowed navigation items based on role
export function getAllowedNavigation(role: UserRole) {
  const definition = ROLE_DEFINITIONS[role];
  const allowedPaths: string[] = [];

  // Map permissions to navigation paths
  if (definition.permissions.includes("system.manage")) {
    allowedPaths.push("/admin/dashboard", "/admin/settings");
  }

  if (definition.permissions.includes("association.view")) {
    allowedPaths.push("/admin/associations");
  }

  if (definition.permissions.includes("club.view")) {
    allowedPaths.push("/admin/clubs");
  }

  if (definition.permissions.includes("member.view")) {
    allowedPaths.push("/admin/players", "/admin/members");
  }

  if (definition.permissions.includes("team.view")) {
    allowedPaths.push("/admin/representative", "/admin/teams");
  }

  if (definition.permissions.includes("registration.view")) {
    allowedPaths.push("/admin/registrations");
  }

  if (definition.permissions.includes("selection.view")) {
    allowedPaths.push("/admin/selection");
  }

  if (definition.permissions.includes("reports.view")) {
    allowedPaths.push("/admin/reports");
  }

  return allowedPaths;
}
