// app/api/auth/logout/route.ts
// Logout endpoint

import { NextRequest, NextResponse } from "next/server";
import { deleteSession } from "@/lib/auth/session";

export async function POST(_request: NextRequest) {
  await deleteSession();
  return NextResponse.json({ success: true });
}
