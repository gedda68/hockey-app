// app/api/auth/session/route.ts
// Get current user session

import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth/middleware";

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);

    if (!user) {
      return NextResponse.json(
        { user: null, authenticated: false },
        { status: 200 }
      );
    }

    return NextResponse.json({
      user,
      authenticated: true,
    });
  } catch (error: any) {
    console.error("Session error:", error);
    return NextResponse.json(
      { error: "Failed to get session" },
      { status: 500 }
    );
  }
}
