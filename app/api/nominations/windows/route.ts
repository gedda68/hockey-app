/**
 * GET /api/nominations/windows
 *
 * Public endpoint — lists nomination windows that are currently open (status = "open").
 * Optionally filtered by category or scopeId.
 *
 * Query params:
 *   category  — rep-team | grade-pref | club-position | assoc-position
 *   scopeId   — club or association ID to filter by
 *   season    — e.g. "2026"
 */

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import type { NominationWindow } from "@/types/nominations";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const category = searchParams.get("category");
    const scopeId  = searchParams.get("scopeId");
    const season   = searchParams.get("season");

    const client = await clientPromise;
    const db = client.db("hockey-app");

    const today = new Date().toISOString().split("T")[0];

    const query: Record<string, unknown> = {
      status:    "open",
      openDate:  { $lte: today },
      closeDate: { $gte: today },
    };

    if (category) query.category = category;
    if (scopeId)  query.scopeId  = scopeId;
    if (season)   query.seasonYear = season;

    const windows = (await db.collection("nomination_windows")
      .find(query)
      .sort({ closeDate: 1 })
      .toArray()) as unknown as NominationWindow[];

    return NextResponse.json({
      windows: windows.map((w) => ({ ...w, _id: (w as any)._id?.toString() })),
    });
  } catch (error) {
    console.error("GET /api/nominations/windows error:", error);
    return NextResponse.json({ error: "Failed to fetch windows" }, { status: 500 });
  }
}
