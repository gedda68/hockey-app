// app/api/auth/logout/route.ts
// Logout endpoint

import { NextRequest } from "next/server";
import { clearSessionResponse } from "@/lib/auth";

export async function POST(request: NextRequest) {
  return clearSessionResponse();
}
