// lib/get-session-user.ts
// TEMPORARY - Auto-login as super admin for development

import { getSession } from "@/lib/auth";

export async function getSessionUser() {
  const session = await getSession();

  if (!session?.user) {
    // TEMPORARY: Return test super admin for development
    console.log("⚠️ No session found, auto-login as test super admin");
    return {
      userId: "dev-superadmin",
      email: "dev@superadmin.com",
      name: "Dev Super Admin",
      role: "superadmin" as const,
      clubId: undefined,
      memberId: undefined,
    };
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

export async function requireAuth() {
  const user = await getSessionUser();
  if (!user) {
    throw new Error("Unauthorized - Please sign in");
  }
  return user;
}

export async function requireRole(role: "superadmin" | "clubadmin" | "member") {
  const user = await requireAuth();
  if (user.role !== role && user.role !== "superadmin") {
    throw new Error(`Forbidden - ${role} role required`);
  }
  return user;
}

export async function requireClubAccess(clubId: string) {
  const user = await requireAuth();
  if (user.role === "superadmin") {
    return user;
  }
  if (user.clubId !== clubId) {
    throw new Error("Forbidden - You don't have access to this club");
  }
  return user;
}
