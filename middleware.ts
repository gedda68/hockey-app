// middleware.ts
// Next.js Edge Middleware — runs on every request before page/API handlers
// Uses custom JWT auth (jose) stored in the "session" httpOnly cookie

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Public routes - no authentication needed
  const publicRoutes = [
    "/",
    "/login",
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

  // Not authenticated - redirect to login
  if (!session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", request.url);
    return NextResponse.redirect(loginUrl);
  }

  const { user } = session;

  // Extract clubId and memberId from path
  const clubMatch = path.match(/\/clubs\/([^\/]+)/);
  const memberMatch = path.match(/\/members\/([^\/]+)/);
  const clubId = clubMatch ? clubMatch[1] : null;
  const memberId = memberMatch ? memberMatch[1] : null;

  // Super admins have access to everything
  if (user.role === "super-admin") {
    return NextResponse.next();
  }

  // Association admins have access to all clubs within their association
  if (user.role === "association-admin") {
    return NextResponse.next();
  }

  // Check club access for club-specific routes
  if (clubId && clubId !== "new") {
    // Club admins must be in the correct club
    if (user.role === "club-admin" && user.clubId !== clubId) {
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

    // Club admins, coaches, and managers can access members in their club
    if (
      user.role === "club-admin" ||
      user.role === "coach" ||
      user.role === "manager"
    ) {
      return NextResponse.next();
    }
  }

  // Member list access - only admins and privileged roles
  if (path.includes("/members") && !memberId) {
    if (user.role === "member" || user.role === "parent") {
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }
  }

  // Renewal routes - only admins
  if (path.includes("/renew")) {
    if (user.role === "member" || user.role === "parent") {
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public).*)"],
};
