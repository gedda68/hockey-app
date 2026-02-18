// lib/permissions/event-permissions.ts
// Role-based permissions for event management

export type UserRole =
  | "admin"
  | "association_admin"
  | "club_admin"
  | "team_captain"
  | "member"
  | "public";

export interface User {
  id: string;
  role: UserRole;
  associations?: string[]; // Association IDs user is admin of
  clubs?: string[]; // Club IDs user is admin of
  teams?: string[]; // Team IDs user is captain of
}

export interface EventPermissions {
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canManageRegistrations: boolean;
}

/**
 * Determine what permissions a user has for a specific event
 */
export function getEventPermissions(
  user: User | null,
  event?: {
    organization: {
      type: "association" | "club" | "team" | "competition";
      id: string;
    };
    visibility: "public" | "private" | "members-only";
    createdBy?: string;
  },
): EventPermissions {
  // Public user (not logged in)
  if (!user) {
    return {
      canView: event?.visibility === "public",
      canCreate: false,
      canEdit: false,
      canDelete: false,
      canManageRegistrations: false,
    };
  }

  // Super admin - can do everything
  if (user.role === "admin") {
    return {
      canView: true,
      canCreate: true,
      canEdit: true,
      canDelete: true,
      canManageRegistrations: true,
    };
  }

  // If no event specified (checking general create permission)
  if (!event) {
    return {
      canView: true,
      canCreate: user.role !== "member" && user.role !== "public",
      canEdit: false,
      canDelete: false,
      canManageRegistrations: false,
    };
  }

  const isCreator = event.createdBy === user.id;
  const orgType = event.organization.type;
  const orgId = event.organization.id;

  // Association Admin
  if (user.role === "association_admin") {
    const isOwnAssociation = user.associations?.includes(orgId) || false;

    return {
      canView: true,
      canCreate: true,
      canEdit: isOwnAssociation || orgType !== "association",
      canDelete: isOwnAssociation || orgType !== "association",
      canManageRegistrations: isOwnAssociation || orgType !== "association",
    };
  }

  // Club Admin
  if (user.role === "club_admin") {
    const isOwnClub = user.clubs?.includes(orgId) || false;
    const canManageClubEvent = orgType === "club" && isOwnClub;
    const canManageTeamEvent = orgType === "team" && isOwnClub; // Teams belong to clubs

    return {
      canView: event.visibility !== "private" || isOwnClub || isCreator,
      canCreate: true,
      canEdit: canManageClubEvent || canManageTeamEvent || isCreator,
      canDelete: canManageClubEvent || canManageTeamEvent || isCreator,
      canManageRegistrations: canManageClubEvent || canManageTeamEvent,
    };
  }

  // Team Captain
  if (user.role === "team_captain") {
    const isOwnTeam = user.teams?.includes(orgId) || false;

    return {
      canView: event.visibility !== "private" || isOwnTeam || isCreator,
      canCreate: true,
      canEdit: (orgType === "team" && isOwnTeam) || isCreator,
      canDelete: (orgType === "team" && isOwnTeam) || isCreator,
      canManageRegistrations: orgType === "team" && isOwnTeam,
    };
  }

  // Regular Member
  return {
    canView: event.visibility !== "private",
    canCreate: false,
    canEdit: false,
    canDelete: false,
    canManageRegistrations: false,
  };
}

/**
 * Can user create events for a specific organization?
 */
export function canCreateEventFor(
  user: User | null,
  orgType: "association" | "club" | "team",
  orgId: string,
): boolean {
  if (!user) return false;
  if (user.role === "admin") return true;

  if (orgType === "association") {
    return (
      user.role === "association_admin" &&
      (user.associations?.includes(orgId) || false)
    );
  }

  if (orgType === "club") {
    return (
      user.role === "association_admin" ||
      (user.role === "club_admin" && (user.clubs?.includes(orgId) || false))
    );
  }

  if (orgType === "team") {
    return (
      user.role === "association_admin" ||
      user.role === "club_admin" ||
      (user.role === "team_captain" && (user.teams?.includes(orgId) || false))
    );
  }

  return false;
}

/**
 * Get list of organizations user can create events for
 */
export function getAvailableOrganizations(user: User | null): {
  associations: Array<{ id: string; name: string }>;
  clubs: Array<{ id: string; name: string }>;
  teams: Array<{ id: string; name: string }>;
} {
  if (!user || user.role === "public" || user.role === "member") {
    return { associations: [], clubs: [], teams: [] };
  }

  // In real implementation, fetch from database
  // This is a placeholder structure
  return {
    associations:
      user.associations?.map((id) => ({ id, name: `Association ${id}` })) || [],
    clubs: user.clubs?.map((id) => ({ id, name: `Club ${id}` })) || [],
    teams: user.teams?.map((id) => ({ id, name: `Team ${id}` })) || [],
  };
}
