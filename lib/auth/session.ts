// lib/auth/session.ts
// Simple session-based authentication with club assignment

import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

const SECRET_KEY =
  process.env.JWT_SECRET || "your-secret-key-change-in-production";
const key = new TextEncoder().encode(SECRET_KEY);

export interface SessionData {
  userId: string;
  email: string;
  name: string;
  role: "super_admin" | "admin" | "user";
  clubId: string | null;
  clubName?: string;
}

// Encrypt session data
async function encrypt(payload: SessionData) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(key);
}

// Decrypt session data
async function decrypt(token: string): Promise<SessionData | null> {
  try {
    const { payload } = await jwtVerify(token, key, {
      algorithms: ["HS256"],
    });
    return payload as SessionData;
  } catch (error) {
    return null;
  }
}

// Create session
export async function createSession(data: SessionData) {
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const session = await encrypt(data);

  const cookieStore = await cookies();
  cookieStore.set("session", session, {
    expires,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
}

// Get current session
export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;

  if (!session) {
    return null;
  }

  return await decrypt(session);
}

// Delete session (logout)
export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete("session");
}

// Check if user is authenticated
export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession();
  return session !== null;
}

// Check if user is super admin
export async function isSuperAdmin(): Promise<boolean> {
  const session = await getSession();
  return session?.role === "super_admin";
}

// Get user's club ID
export async function getUserClubId(): Promise<string | null> {
  const session = await getSession();
  return session?.clubId || null;
}
