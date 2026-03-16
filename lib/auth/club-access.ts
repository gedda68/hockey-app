// lib/auth/club-access.ts
// Club-based access control utilities (without Clerk)

import { cookies } from "next/headers";

interface ClubAccess {
  userId: string;
  clubId: string | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
}

/**
 * Get the current user's club access permissions
 * This reads from cookies/session - adapt to your auth system
 */
export async function getClubAccess(): Promise<ClubAccess> {
  try {
    const cookieStore = await cookies();

    // Read from your auth cookie/session
    // ADAPT THIS to your auth system (NextAuth, custom, etc.)
    const userId = cookieStore.get("userId")?.value;
    const clubId = cookieStore.get("clubId")?.value || null;
    const role = cookieStore.get("userRole")?.value || "admin";

    if (!userId) {
      throw new Error("Unauthorized - No user session");
    }

    return {
      userId,
      clubId,
      isAdmin: role === "admin" || role === "super_admin",
      isSuperAdmin: role === "super_admin",
    };
  } catch (error) {
    throw new Error("Unauthorized - No user session");
  }
}

/**
 * TEMPORARY: For development/testing without auth
 * Remove this in production!
 */
export async function getClubAccessDev(): Promise<ClubAccess> {
  // FOR TESTING ONLY - Returns mock data
  return {
    userId: "dev-user-123",
    clubId: null, // Set to a clubId to test club admin, null for super admin
    isAdmin: true,
    isSuperAdmin: true, // Set to false to test club admin restrictions
  };
}

/**
 * Check if user has access to a specific club
 */
export function hasClubAccess(
  userClubId: string | null,
  targetClubId: string,
  isSuperAdmin: boolean,
): boolean {
  // Super admins can access all clubs
  if (isSuperAdmin) {
    return true;
  }

  // Regular club admins can only access their own club
  return userClubId === targetClubId;
}

/**
 * Filter rosters based on user's club access
 */
export function filterRostersByClub<T extends { clubId: string }>(
  rosters: T[],
  userClubId: string | null,
  isSuperAdmin: boolean,
): T[] {
  // Super admins see all rosters
  if (isSuperAdmin) {
    return rosters;
  }

  // Club admins only see their club's rosters
  if (!userClubId) {
    return [];
  }

  return rosters.filter((roster) => roster.clubId === userClubId);
}

/**
 * Verify user can modify a roster
 */
export async function verifyRosterAccess(
  rosterId: string,
  db: any,
): Promise<void> {
  // Use dev version for testing, switch to getClubAccess() when auth is ready
  const access = await getClubAccessDev(); // Change to getClubAccess() in production

  // Super admins can modify anything
  if (access.isSuperAdmin) {
    return;
  }

  // Get the roster
  const roster = await db.collection("teamRosters").findOne({ id: rosterId });

  if (!roster) {
    throw new Error("Roster not found");
  }

  // Check if user's club matches roster's club
  if (!hasClubAccess(access.clubId, roster.clubId, access.isSuperAdmin)) {
    throw new Error("Forbidden - You don't have access to this club's teams");
  }
}
