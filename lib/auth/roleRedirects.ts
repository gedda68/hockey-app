// lib/auth/roleRedirects.ts
// Role-based navigation helper

/**
 * Get the appropriate dashboard path for a user based on their role.
 * The returned path MUST exist in the app/(admin)/admin/ or app/(website)/ directory.
 */
export function getRoleDashboard(
  role: string,
  clubSlugOrId?: string | null,
  associationId?: string | null
): string {
  const clubId = clubSlugOrId; // may be a slug or legacy id — both work with the clubs API
  switch (role) {
    // ── Super admin ─────────────────────────────────────────────────────────
    case "super-admin":
      return "/admin/dashboard";

    // ── Association-level ────────────────────────────────────────────────────
    case "association-admin":
      return associationId
        ? `/admin/associations/${associationId}`
        : "/admin/associations";

    case "assoc-committee":
    case "assoc-coach":
    case "assoc-selector":
    case "assoc-registrar":
      return "/admin/representative";

    case "assoc-competition":
      return associationId
        ? `/admin/associations/${associationId}`
        : "/admin/associations";

    // ── Club-level ───────────────────────────────────────────────────────────
    case "club-admin":
      // Go to the club's edit page (the view/overview page for that specific club)
      return clubId ? `/admin/clubs/${clubId}/edit` : "/admin/clubs";

    case "club-committee":
    case "registrar":
      return "/admin/members";

    case "coach":
    case "manager":
      return "/admin/teams";

    case "team-selector":
      return "/admin/nominations";

    case "umpire":
      return "/admin/representative";

    case "volunteer":
      return clubId ? `/admin/clubs/${clubId}/edit` : "/admin/clubs";

    // ── Portal (no admin access) ─────────────────────────────────────────────
    case "player":
    case "member":
    case "parent":
      return "/nominate";

    default:
      return "/admin/dashboard";
  }
}

/**
 * Get user-friendly display name for a role
 */
export function getRoleDisplayName(role: string): string {
  const roleNames: Record<string, string> = {
    "super-admin":       "System Administrator",
    "association-admin": "Association Administrator",
    "assoc-committee":   "Association Committee",
    "assoc-coach":       "Association Coach",
    "assoc-selector":    "Association Selector",
    "assoc-registrar":   "Association Registrar",
    "assoc-competition": "Association Competition Coordinator",
    "club-admin":        "Club Administrator",
    "club-committee":    "Club Committee",
    "coach":             "Coach",
    "manager":           "Team Manager",
    "registrar":         "Club Registrar",
    "team-selector":     "Team Selector",
    "umpire":            "Umpire",
    "volunteer":         "Volunteer",
    "player":            "Player",
    "member":            "Member",
    "parent":            "Parent / Guardian",
  };
  return roleNames[role] || role;
}

/**
 * Returns true if this role has access to the /admin area
 */
export function canAccessAdmin(role: string): boolean {
  return [
    "super-admin",
    "association-admin",
    "assoc-committee",
    "assoc-coach",
    "assoc-selector",
    "assoc-registrar",
    "assoc-competition",
    "club-admin",
    "club-committee",
    "registrar",
    "coach",
    "manager",
    "team-selector",
    "umpire",
    "volunteer",
  ].includes(role);
}
