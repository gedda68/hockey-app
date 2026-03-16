// app/api/auth/me/route.ts
// Get current user session

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    return NextResponse.json({
      user: session,
    });
  } catch (error: any) {
    return NextResponse.json({ error: "Session error" }, { status: 500 });
  }
}
