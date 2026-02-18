// middleware-custom-auth.ts
// Middleware using custom JWT auth (Next.js 16 compatible)
// Use this version after setting up custom auth

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Public routes - no authentication needed
  const publicRoutes = [
    "/",
    "/auth/signin",
    "/auth/signup",
    "/auth/login",
    "/about",
    "/contact",
  ];

  // API routes that don't need auth
  const publicApiRoutes = [
    "/api/auth/login",
    "/api/auth/logout",
    "/api/auth/session",
  ];

  if (
    publicRoutes.some((route) => path.startsWith(route)) ||
    publicApiRoutes.some((route) => path.startsWith(route))
  ) {
    return NextResponse.next();
  }

  // Get session
  const session = await getSessionFromRequest(request);

  // Not authenticated - redirect to signin
  if (!session) {
    const signInUrl = new URL("/auth/signin", request.url);
    signInUrl.searchParams.set("callbackUrl", request.url);
    return NextResponse.redirect(signInUrl);
  }

  const { user } = session;

  // Extract clubId and memberId from path
  const clubMatch = path.match(/\/clubs\/([^\/]+)/);
  const memberMatch = path.match(/\/members\/([^\/]+)/);
  const clubId = clubMatch ? clubMatch[1] : null;
  const memberId = memberMatch ? memberMatch[1] : null;

  // Super admins have access to everything
  if (user.role === "superadmin") {
    return NextResponse.next();
  }

  // Check club access for club-specific routes
  if (clubId && clubId !== "new") {
    // Club admins must be in the correct club
    if (user.role === "clubadmin" && user.clubId !== clubId) {
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }

    // Members must be in the correct club
    if (user.role === "member" && user.clubId !== clubId) {
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }
  }

  // Member-specific route access
  if (path.includes("/members") && memberId && memberId !== "new") {
    // Members can only view/edit their own profile
    if (user.role === "member") {
      // Allow access to their own profile
      if (user.memberId === memberId) {
        return NextResponse.next();
      }

      // Deny access to other member profiles
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }

    // Club admins can access all members in their club
    if (user.role === "clubadmin") {
      return NextResponse.next();
    }
  }

  // Member list access - only admins
  if (path.includes("/members") && !memberId) {
    if (user.role === "member") {
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }
  }

  // Renewal routes - only admins
  if (path.includes("/renew")) {
    if (user.role === "member") {
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public).*)"],
};
