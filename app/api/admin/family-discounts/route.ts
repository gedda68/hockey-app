/**
 * POST /api/admin/family-discounts { apply?: boolean }
 * Works out family discounts on the club's unpaid fees. Without apply it only shows what would change.
 * Applying adds a negative "Family discount" line to each affected unpaid payment, once.
 */

import { NextRequest, NextResponse } from "next/server";
import { treasurerContext } from "@/lib/fees/treasurer";
import { familyDiscounts } from "@/lib/fees/service";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const t = await treasurerContext(request, "POST");
    if (!t.ok) return t.res;
    if (!t.ctx.clubId) return NextResponse.json({ error: "Family discounts belong to a club" }, { status: 400 });
    const b = await request.json().catch(() => ({}));
    const r = await familyDiscounts(t.ctx.db, t.ctx.clubId, b?.apply === true);
    return r.ok ? NextResponse.json(r) : NextResponse.json({ error: r.error }, { status: r.status });
  } catch (e) {
    console.error("family discounts error:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
