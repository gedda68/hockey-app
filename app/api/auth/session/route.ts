// app/api/auth/session/route.ts
// Get current session

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  return NextResponse.json(session);
}
