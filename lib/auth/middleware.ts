// lib/auth/middleware.ts
// Permission helpers for API routes — uses the same `session` cookie as lib/auth/session.ts

import { NextRequest, NextResponse } from "next/server";
import { getSession, type SessionData } from "@/lib/auth/session";
import type { UserSession } from "@/lib/db/schemas/user";
import type { Permission, RoleAssignment, UserRole } from "@/lib/types/roles";
import { getEffectivePermissions } from "@/lib/types/roles";

export interface AuthenticatedRequest extends NextRequest {
  user?: UserSession;
}

function sessionDataToAssignments(s: SessionData): RoleAssignment[] {
  const grantedAt = new Date().toISOString();
  if (s.scopedRoles && s.scopedRoles.length > 0) {
    return s.scopedRoles.map((sr) => ({
      role: sr.role as UserRole,
      scopeType: sr.scopeType,
      scopeId: sr.scopeId,
      grantedAt,
      active: true,
    }));
  }
  return [
    {
      role: s.role as UserRole,
      scopeType: s.clubId
        ? "club"
        : s.associationId
          ? "association"
          : "global",
      scopeId: s.clubId ?? s.associationId ?? undefined,
      grantedAt,
      active: true,
    },
  ];
}

export async function sessionToUserSession(s: SessionData): Promise<UserSession> {
  const assignments = sessionDataToAssignments(s);
  const perms = getEffectivePermissions(assignments);
  return {
    userId: s.userId,
    email: s.email,
    firstName: s.firstName ?? "",
    lastName: s.lastName ?? "",
    role: s.role as UserRole,
    associationId: s.associationId ?? null,
    clubId: s.clubId ?? null,
    assignedTeams: [],
    linkedMembers: [],
    permissions: [...perms] as string[],
  };
}

/** Load user from the HttpOnly `session` JWT (same as the rest of the app). */
export async function getUserFromRequest(
  _request: NextRequest,
): Promise<UserSession | null> {
  const session = await getSession();
  if (!session) return null;
  return sessionToUserSession(session);
}

export async function requireAuth(request: NextRequest): Promise<{
  user: UserSession;
  response?: NextResponse;
}> {
  const user = await getUserFromRequest(request);

  if (!user) {
    return {
      user: null as unknown as UserSession,
      response: NextResponse.json(
        { error: "Unauthorized - Please log in" },
        { status: 401 },
      ),
    };
  }

  return { user };
}

export async function requirePermission(
  request: NextRequest,
  permission: Permission,
): Promise<{
  user: UserSession;
  response?: NextResponse;
}> {
  const { user, response } = await requireAuth(request);

  if (response) return { user, response };

  if (!(user.permissions as string[]).includes(permission)) {
    return {
      user,
      response: NextResponse.json(
        { error: "Forbidden - Insufficient permissions" },
        { status: 403 },
      ),
    };
  }

  return { user };
}

export async function requireResourceAccess(
  request: NextRequest,
  resourceType: "association" | "club",
  resourceId: string,
): Promise<{
  user: UserSession;
  response?: NextResponse;
}> {
  const { user, response } = await requireAuth(request);

  if (response) return { user, response };

  if (user.role === "super-admin") {
    return { user };
  }

  if (resourceType === "association") {
    if (
      user.role === "association-admin" &&
      user.associationId === resourceId
    ) {
      return { user };
    }
  }

  if (resourceType === "club") {
    if (
      (user.role === "club-admin" ||
        user.role === "coach" ||
        user.role === "manager") &&
      user.clubId === resourceId
    ) {
      return { user };
    }

    if (user.role === "association-admin") {
      return { user };
    }
  }

  return {
    user,
    response: NextResponse.json(
      { error: "Forbidden - You don't have access to this resource" },
      { status: 403 },
    ),
  };
}

export async function requireRole(
  request: NextRequest,
  allowedRoles: string[],
): Promise<{
  user: UserSession;
  response?: NextResponse;
}> {
  const { user, response } = await requireAuth(request);

  if (response) return { user, response };

  if (!allowedRoles.includes(user.role)) {
    return {
      user,
      response: NextResponse.json(
        { error: "Forbidden - Insufficient role" },
        { status: 403 },
      ),
    };
  }

  return { user };
}
