// lib/auth/roleRedirects.ts
// Role-based navigation helper

import type { UserRole } from "@/lib/types/roles";

/**
 * Get the appropriate dashboard path for a user based on their role
 */
export function getRoleDashboard(
  role: UserRole,
  clubId?: string | null,
  associationId?: string | null
): string {
  switch (role) {
    case "super-admin":
      // Full admin dashboard with everything
      return "/admin/dashboard";

    case "association-admin":
      // Association-specific dashboard
      return associationId
        ? `/admin/associations/${associationId}`
        : "/admin/dashboard";

    case "club-admin":
      // Club-specific dashboard
      return clubId ? `/admin/clubs/${clubId}` : "/admin/clubs";

    case "coach":
    case "manager":
      // Team management
      return "/admin/teams";

    case "umpire":
      // Match schedule
      return "/admin/matches";

    case "volunteer":
      // Limited club access
      return clubId ? `/admin/clubs/${clubId}` : "/admin/clubs";

    case "member":
    case "parent":
      // Player/member portal
      return "/portal/dashboard";

    default:
      // Fallback to general admin
      return "/admin/dashboard";
  }
}

/**
 * Get user-friendly role name
 */
export function getRoleDisplayName(role: UserRole): string {
  const roleNames: Record<UserRole, string> = {
    "super-admin": "System Administrator",
    "association-admin": "Association Administrator",
    "club-admin": "Club Administrator",
    coach: "Coach",
    manager: "Team Manager",
    umpire: "Umpire",
    volunteer: "Volunteer",
    member: "Member",
    parent: "Parent/Guardian",
  };
  return roleNames[role] || role;
}

/**
 * Check if user can access admin area
 */
export function canAccessAdmin(role: UserRole): boolean {
  return [
    "super-admin",
    "association-admin",
    "club-admin",
    "coach",
    "manager",
    "umpire",
    "volunteer",
  ].includes(role);
}
