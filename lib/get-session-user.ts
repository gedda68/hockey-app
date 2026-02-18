// lib/get-session-user.ts

import { getSession } from "@/lib/auth";
import type { UserRole } from "@/lib/types/roles";

export async function getSessionUser() {
  const session = await getSession();

  if (!session?.user) {
    return null;
  }

  return {
    userId: session.user.userId,
    email: session.user.email,
    name: session.user.name,
    role: session.user.role,
    associationId: session.user.associationId,
    clubId: session.user.clubId,
    memberId: session.user.memberId,
  };
}

export async function requireAuth() {
  const user = await getSessionUser();
  if (!user) {
    throw new Error("Unauthorized - Please sign in");
  }
  return user;
}

export async function requireRole(role: UserRole) {
  const user = await requireAuth();
  if (user.role !== role && user.role !== "super-admin") {
    throw new Error(`Forbidden - ${role} role required`);
  }
  return user;
}

export async function requireClubAccess(clubId: string) {
  const user = await requireAuth();
  if (user.role === "super-admin" || user.role === "association-admin") {
    return user;
  }
  if (user.clubId !== clubId) {
    throw new Error("Forbidden - You don't have access to this club");
  }
  return user;
}
