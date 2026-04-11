// GET .../rosters/[rosterId]/staff-compliance — Epic G2 WWCC / credential overview.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import clientPromise from "@/lib/mongodb";
import {
  requirePermission,
  requireResourceAccess,
} from "@/lib/auth/middleware";
import { collectStaffComplianceRows } from "@/lib/coaching/teamStaffCompliance";

type Params = { params: Promise<{ rosterId: string }> };

const QuerySchema = z.object({
  expiringWithinDays: z.coerce.number().int().min(1).max(730).optional(),
});

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { rosterId } = await params;
    const sp = Object.fromEntries(new URL(request.url).searchParams);
    const q = QuerySchema.safeParse(sp);
    if (!q.success) {
      return NextResponse.json(
        { error: "Invalid query", details: q.error.flatten() },
        { status: 400 },
      );
    }
    const expiringWithinDays = q.data.expiringWithinDays ?? 90;

    const client = await clientPromise;
    const db = client.db("hockey-app");

    const roster = await db.collection("teamRosters").findOne({ id: rosterId });
    if (!roster) {
      return NextResponse.json({ error: "Roster not found" }, { status: 404 });
    }

    const { response: permRes } = await requirePermission(request, "team.edit");
    if (permRes) return permRes;
    if (roster.clubId) {
      const { response: scopeRes } = await requireResourceAccess(
        request,
        "club",
        String(roster.clubId),
      );
      if (scopeRes) return scopeRes;
    }

    const now = new Date();
    const staff = collectStaffComplianceRows(
      roster as Parameters<typeof collectStaffComplianceRows>[0],
      now,
      expiringWithinDays,
    );
    const summary = {
      total: staff.length,
      wwccMissing: staff.filter((s) => s.wwccStatus === "missing").length,
      wwccExpired: staff.filter((s) => s.wwccStatus === "expired").length,
      wwccExpiring: staff.filter((s) => s.wwccStatus === "expiring").length,
      wwccOk: staff.filter((s) => s.wwccStatus === "ok").length,
    };

    return NextResponse.json({
      rosterId,
      clubId: roster.clubId ?? null,
      expiringWithinDays,
      generatedAt: now.toISOString(),
      summary,
      staff,
    });
  } catch (e: unknown) {
    console.error("GET staff-compliance error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
