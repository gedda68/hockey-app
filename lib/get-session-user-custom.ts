// lib/get-session-user-custom.ts
// Helper to get authenticated user (Custom Auth version)

import { getSession } from "@/lib/auth";
import { User } from "@/lib/types/member";
import type { UserRole } from "@/lib/types/roles";

/**
 * Get the authenticated user from the session
 */
export async function getSessionUser(): Promise<User | null> {
  const session = await getSession();

  if (!session?.user) {
    return null;
  }

  return {
    userId: session.user.userId,
    email: session.user.email,
    name: session.user.name,
    role: session.user.role,
    clubId: session.user.clubId,
    memberId: session.user.memberId,
  };
}

/**
 * Require authentication - throws error if not authenticated
 */
export async function requireAuth(): Promise<User> {
  const user = await getSessionUser();

  if (!user) {
    throw new Error("Unauthorized - Please sign in");
  }

  return user;
}

/**
 * Require specific role - throws error if user doesn't have required role
 */
export async function requireRole(role: UserRole): Promise<User> {
  const user = await requireAuth();

  if (user.role !== role && user.role !== "super-admin") {
    throw new Error(`Forbidden - ${role} role required`);
  }

  return user;
}

/**
 * Check if user has permission for a specific club
 */
export async function requireClubAccess(clubId: string): Promise<User> {
  const user = await requireAuth();

  // Super admins and association admins have access to all clubs
  if (user.role === "super-admin" || user.role === "association-admin") {
    return user;
  }

  // Club admins and members must be in the correct club
  if (user.clubId !== clubId) {
    throw new Error("Forbidden - You don't have access to this club");
  }

  return user;
}
