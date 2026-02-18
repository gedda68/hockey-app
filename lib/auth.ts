// lib/auth.ts
// Custom authentication using JWT (Next.js 16 compatible)

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET || "your-secret-key-min-32-chars-long",
);

export interface User {
  userId: string;
  email: string;
  name?: string;
  role: "superadmin" | "clubadmin" | "member";
  clubId?: string;
  memberId?: string;
}

export interface Session {
  user: User;
  expires: string;
}

// Create a session token
export async function createSession(user: User): Promise<string> {
  const token = await new SignJWT({ user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d") // 30 days
    .sign(secret);

  return token;
}

// Verify and decode a session token
export async function verifySession(token: string): Promise<Session | null> {
  try {
    const verified = await jwtVerify(token, secret);
    const user = verified.payload.user as User;
    const expires = new Date((verified.payload.exp || 0) * 1000).toISOString();

    return { user, expires };
  } catch (error) {
    return null;
  }
}

// Get session from cookies (Server Components)
export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;

  if (!token) return null;

  return verifySession(token);
}

// Get session from request (Middleware & API Routes)
export async function getSessionFromRequest(
  request: NextRequest,
): Promise<Session | null> {
  const token = request.cookies.get("session")?.value;

  if (!token) return null;

  return verifySession(token);
}

// Set session cookie
export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();

  cookieStore.set("session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: "/",
  });
}

// Clear session cookie
export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete("session");
}

// Create session response (for API routes)
export function createSessionResponse(
  token: string,
  data?: any,
  status: number = 200,
): NextResponse {
  const response = NextResponse.json(data || { success: true }, { status });

  response.cookies.set("session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });

  return response;
}

// Clear session response (for logout)
export function clearSessionResponse(): NextResponse {
  const response = NextResponse.json({ success: true });

  response.cookies.set("session", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });

  return response;
}
