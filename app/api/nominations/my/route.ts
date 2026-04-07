/**
 * GET /api/nominations/my
 *
 * Returns all nominations for the currently logged-in user (by userId or memberId).
 * Joins the nomination window record for context.
 *
 * Optional query params:
 *   windowId — filter to a specific window
 *   season   — filter by season year
 */

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";
import type { Nomination, NominationWindow } from "@/types/nominations";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { searchParams } = req.nextUrl;
    const windowId = searchParams.get("windowId");
    const season   = searchParams.get("season");

    const client = await clientPromise;
    const db = client.db("hockey-app");

    // Match by userId or memberId — session may have either
    const nomineeIds = [session.userId, session.memberId].filter(Boolean) as string[];

    const query: Record<string, unknown> = {
      nomineeId: { $in: nomineeIds },
    };
    if (windowId) query.windowId = windowId;
    if (season)   query.season   = season;

    const nominations = (await db.collection("rep_nominations")
      .find(query)
      .sort({ nominatedAt: -1 })
      .toArray()) as unknown as Nomination[];

    // Join window data for each nomination
    const windowIds = [...new Set(nominations.map((n) => n.windowId).filter(Boolean))];
    const windowDocs = windowIds.length > 0
      ? ((await db.collection("nomination_windows")
          .find({ windowId: { $in: windowIds } })
          .toArray()) as unknown as NominationWindow[])
      : [];
    const windowMap = Object.fromEntries(windowDocs.map((w) => [w.windowId, w]));

    const result = nominations.map((n) => ({
      ...n,
      _id:    (n as any)._id?.toString(),
      window: n.windowId ? {
        ...(windowMap[n.windowId] ?? {}),
        _id: undefined,
      } : undefined,
    }));

    return NextResponse.json({ nominations: result });
  } catch (error) {
    console.error("GET /api/nominations/my error:", error);
    return NextResponse.json({ error: "Failed to fetch nominations" }, { status: 500 });
  }
}
