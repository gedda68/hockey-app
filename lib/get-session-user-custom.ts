// lib/get-session-user-custom.ts
// Helper to get authenticated user from the session (uses lib/auth/session — JWT_SECRET)

import { getSession } from "@/lib/auth/session";

export interface SessionUser {
  userId: string;
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  role: string;
  associationId?: string | null;
  clubId?: string | null;
  memberId?: string | null;
  username?: string;
}

/**
 * Get the authenticated user from the current session.
 * Returns null if not authenticated.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await getSession();
  if (!session) return null;

  return {
    userId:        session.userId,
    email:         session.email,
    name:          session.name,
    firstName:     session.firstName,
    lastName:      session.lastName,
    role:          session.role,
    associationId: session.associationId ?? null,
    clubId:        session.clubId ?? null,
    memberId:      session.memberId ?? null,
    username:      session.username,
  };
}

/**
 * Require authentication — throws if not authenticated.
 */
export async function requireAuth(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new Error("Unauthorized — please sign in");
  return user;
}

/**
 * Require a specific role — throws if the user's role doesn't match.
 * Super-admin always passes.
 */
export async function requireRole(role: string): Promise<SessionUser> {
  const user = await requireAuth();
  if (user.role !== role && user.role !== "super-admin") {
    throw new Error(`Forbidden — ${role} role required`);
  }
  return user;
}

/**
 * Require the user to have access to a specific club.
 * Super-admin and association-admin always pass; club-level roles must match clubId.
 */
export async function requireClubAccess(clubId: string): Promise<SessionUser> {
  const user = await requireAuth();

  if (user.role === "super-admin" || user.role === "association-admin") {
    return user;
  }

  if (user.clubId !== clubId) {
    throw new Error("Forbidden — you don't have access to this club");
  }

  return user;
}

/**
 * Require the user to have access to a specific association.
 * Super-admin always passes; association-level roles must match associationId.
 */
export async function requireAssociationAccess(associationId: string): Promise<SessionUser> {
  const user = await requireAuth();

  if (user.role === "super-admin") return user;

  if (user.associationId !== associationId) {
    throw new Error("Forbidden — you don't have access to this association");
  }

  return user;
}
