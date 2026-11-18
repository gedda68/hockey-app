/** GET/PUT /api/admin/fee-settings → payment terms (days until a fee is overdue) and the family-discount rules for the club. */

import { NextRequest, NextResponse } from "next/server";
import { treasurerContext } from "@/lib/fees/treasurer";
import { loadSettings, saveSettings } from "@/lib/fees/service";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const t = await treasurerContext(request, "GET");
  if (!t.ok) return t.res;
  if (!t.ctx.clubId) return NextResponse.json({ error: "Settings belong to a club" }, { status: 400 });
  return NextResponse.json(await loadSettings(t.ctx.db, t.ctx.clubId));
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
  const t = await treasurerContext(request, "PUT");
  if (!t.ok) return t.res;
  if (!t.ctx.clubId) return NextResponse.json({ error: "Settings belong to a club" }, { status: 400 });
  const b = await request.json().catch(() => ({}));
  return NextResponse.json(await saveSettings(t.ctx.db, t.ctx.clubId, b));
}
