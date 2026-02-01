// lib/auth/middleware.ts
// Permission middleware for API routes

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import type { UserSession } from "@/lib/db/schemas/user";
import type { Permission } from "@/lib/types/roles";
import { hasPermission } from "@/lib/types/roles";

const JWT_SECRET =
  process.env.JWT_SECRET || "your-secret-key-change-in-production";

export interface AuthenticatedRequest extends NextRequest {
  user?: UserSession;
}

// Verify JWT token and extract user session
export async function verifyToken(token: string): Promise<UserSession | null> {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as UserSession;
    return decoded;
  } catch (error) {
    return null;
  }
}

// Get user from request
export async function getUserFromRequest(
  request: NextRequest
): Promise<UserSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth-token")?.value;

  if (!token) return null;

  return verifyToken(token);
}

// Middleware to require authentication
export async function requireAuth(request: NextRequest): Promise<{
  user: UserSession;
  response?: NextResponse;
}> {
  const user = await getUserFromRequest(request);

  if (!user) {
    return {
      user: null as any,
      response: NextResponse.json(
        { error: "Unauthorized - Please log in" },
        { status: 401 }
      ),
    };
  }

  return { user };
}

// Middleware to require specific permission
export async function requirePermission(
  request: NextRequest,
  permission: Permission
): Promise<{
  user: UserSession;
  response?: NextResponse;
}> {
  const { user, response } = await requireAuth(request);

  if (response) return { user, response };

  if (!hasPermission(user.role, permission)) {
    return {
      user,
      response: NextResponse.json(
        { error: "Forbidden - Insufficient permissions" },
        { status: 403 }
      ),
    };
  }

  return { user };
}

// Middleware to require resource ownership
export async function requireResourceAccess(
  request: NextRequest,
  resourceType: "association" | "club",
  resourceId: string
): Promise<{
  user: UserSession;
  response?: NextResponse;
}> {
  const { user, response } = await requireAuth(request);

  if (response) return { user, response };

  // Super admin can access everything
  if (user.role === "super-admin") {
    return { user };
  }

  // Check association access
  if (resourceType === "association") {
    if (
      user.role === "association-admin" &&
      user.associationId === resourceId
    ) {
      return { user };
    }
  }

  // Check club access
  if (resourceType === "club") {
    if (
      (user.role === "club-admin" ||
        user.role === "coach" ||
        user.role === "manager") &&
      user.clubId === resourceId
    ) {
      return { user };
    }

    // Association admin can access child clubs
    if (user.role === "association-admin") {
      // Need to verify club belongs to their association
      // This will be done with a database query
      return { user }; // Will validate in actual route
    }
  }

  return {
    user,
    response: NextResponse.json(
      { error: "Forbidden - You don't have access to this resource" },
      { status: 403 }
    ),
  };
}

// Middleware to require specific role
export async function requireRole(
  request: NextRequest,
  allowedRoles: string[]
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
        { status: 403 }
      ),
    };
  }

  return { user };
}

// Helper to create JWT token
export function createToken(user: UserSession): string {
  return jwt.sign(user, JWT_SECRET, {
    expiresIn: "7d",
  });
}

// Helper to set auth cookie
export function setAuthCookie(response: NextResponse, token: string) {
  response.cookies.set("auth-token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

// Helper to clear auth cookie
export function clearAuthCookie(response: NextResponse) {
  response.cookies.delete("auth-token");
}
