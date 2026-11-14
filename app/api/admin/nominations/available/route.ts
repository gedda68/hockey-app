// app/api/admin/nominations/available/route.ts
// GET - Return all currently open nomination opportunities with tournament info

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { requirePermission } from "@/lib/auth/middleware";
import { loadOpenOpportunities } from "@/lib/nominations/openOpportunities";

// ─── GET /api/admin/nominations/available ─────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const { response: authRes } = await requirePermission(request, "selection.view");
    if (authRes) return authRes;

    const { searchParams } = new URL(request.url);
    const season = searchParams.get("season") ?? new Date().getFullYear().toString();

    const db = (await clientPromise).db("hockey-app");
    return NextResponse.json({ opportunities: await loadOpenOpportunities(db, season) });
  } catch (error: unknown) {
    console.error("GET /api/admin/nominations/available error:", error);
    return NextResponse.json({ error: "Failed to fetch available nominations" }, { status: 500 });
  }
}
