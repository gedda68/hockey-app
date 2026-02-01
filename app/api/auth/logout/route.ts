// app/api/auth/logout/route.ts
// User logout endpoint

import { NextRequest, NextResponse } from "next/server";
import { clearAuthCookie } from "@/lib/auth/middleware";

export async function POST(request: NextRequest) {
  const response = NextResponse.json({
    message: "Logged out successfully",
  });

  clearAuthCookie(response);
  return response;
}
