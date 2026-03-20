// lib/auth/session.ts
// JWT session using jose — Edge-compatible

import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

const SECRET_KEY =
  process.env.JWT_SECRET || "your-secret-key-change-in-production";
const key = new TextEncoder().encode(SECRET_KEY);

export interface SessionData {
  userId: string;
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  role: string; // full role string — e.g. "super-admin", "club-admin", "player"
  associationId?: string | null;
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
