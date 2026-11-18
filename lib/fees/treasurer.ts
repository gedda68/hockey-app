// lib/fees/treasurer.ts — who may see the club's money and run plans and discounts, and which club they're acting for.

import { NextRequest, NextResponse } from "next/server";
import type { Db } from "mongodb";
import { getDatabase } from "@/lib/mongodb";
import { getSession, type SessionData } from "@/lib/auth/session";
import { requireAnyPermission } from "@/lib/auth/middleware";
import { buildPaymentScopeFilter } from "@/lib/auth/scopeGuard";
import { areaGuard } from "@/lib/access/enforce";

export type Ctx = { db: Db; session: SessionData; scope: Record<string, unknown>; clubId: string | null };

/** Fees permission plus the Finance area of the access matrix. clubId is the club being acted for (a super-admin names it with ?clubId=). */
export async function treasurerContext(request: NextRequest, method: string): Promise<{ ok: true; ctx: Ctx } | { ok: false; res: NextResponse }> {
  const denied = await areaGuard("fees", method);
  if (denied) return { ok: false, res: denied };
  const { response } = await requireAnyPermission(request, ["club.fees", "association.fees", "system.manage"]);
  if (response) return { ok: false, res: response };
  const session = await getSession();
  if (!session) return { ok: false, res: NextResponse.json({ error: "Authentication required" }, { status: 401 }) };
  const scoped = await buildPaymentScopeFilter(session, null);
  if ("response" in scoped) return { ok: false, res: scoped.response };
  const asked = request.nextUrl.searchParams.get("clubId");
  const clubId = session.role === "super-admin" ? asked || null : String(session.clubId || session.clubSlug || "") || null;
  return { ok: true, ctx: { db: await getDatabase(), session, scope: scoped.filter, clubId } };
}
