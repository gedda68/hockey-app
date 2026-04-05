// lib/auth/session.ts
// JWT session using jose — Edge-compatible

import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

const SECRET_KEY = process.env.JWT_SECRET;
if (!SECRET_KEY) throw new Error("JWT_SECRET environment variable is not set");
const key = new TextEncoder().encode(SECRET_KEY);

/**
 * Minimal scoped role — stored in the JWT for middleware access checks.
 * Mirrors RoleAssignment but without the heavy metadata to keep the cookie small.
 */
export interface ScopedRole {
  role: string;
  scopeType: "global" | "association" | "club" | "team";
  scopeId?: string;  // associationId or clubId — absent for global roles
}

export interface SessionData {
  userId: string;
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  /** Primary (highest-privilege) role — used for redirect decisions and display */
  role: string;
  /**
   * All active scoped role assignments for this user.
   * Populated from user.roles[] at login so the middleware can make fine-grained
   * access decisions for multi-role members (e.g. a player who is also an
   * association-level umpire or selector).
   */
  scopedRoles?: ScopedRole[];
  associationId?: string | null;
  /**
   * The hierarchical tier of the user's primary association.
   * Derived from association.level at login and stored here so middleware and
   * UI can make level-aware access decisions without a DB round-trip.
   *   "national"  — level 0 (e.g. Hockey Australia)
   *   "state"     — level 1 (e.g. Hockey QLD)
   *   "city"      — level 2 (e.g. Brisbane Hockey)
   *   "district"  — level 3+ (regional sub-bodies)
   * Absent for club-scoped users and super-admin.
   */
  associationLevel?: "national" | "state" | "city" | "district";
  clubId?: string | null;
  clubSlug?: string | null;  // URL-safe slug derived from club name
  clubName?: string;
  memberId?: string | null;
  username?: string;
  forcePasswordChange?: boolean;
}

// Encrypt session data into a JWT
async function encrypt(payload: SessionData): Promise<string> {
  return await new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(key);
}

// Decrypt and verify a session JWT
async function decrypt(token: string): Promise<SessionData | null> {
  try {
    const { payload } = await jwtVerify(token, key, {
      algorithms: ["HS256"],
    });
    return payload as unknown as SessionData;
  } catch {
    return null;
  }
}

// Create session (sets HttpOnly cookie)
export async function createSession(data: SessionData): Promise<void> {
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const token = await encrypt(data);

  const cookieStore = await cookies();
  cookieStore.set("session", token, {
    expires,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
}

// Read current session (Server Components / API Routes)
export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  if (!token) return null;
  return decrypt(token);
}

// Delete session cookie
export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete("session");
}

// Helpers
export async function isAuthenticated(): Promise<boolean> {
  return (await getSession()) !== null;
}

export async function isSuperAdmin(): Promise<boolean> {
  const s = await getSession();
  return s?.role === "super-admin";
}

export async function getUserClubId(): Promise<string | null> {
  const s = await getSession();
  return s?.clubId || null;
}
