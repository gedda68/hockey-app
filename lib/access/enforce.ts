// lib/access/enforce.ts — server guard for API routes. Returns a response to send when the matrix says no,
// or null to carry on.

import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";
import { accessForSession } from "@/lib/access/memberAccess";
import { decideArea, needForMethod, type LogicalArea } from "@/lib/access/areaAccess";
import type { AccessCode } from "@/lib/access/matrix";

export async function areaGuard(area: LogicalArea, method: string, opts: { need?: AccessCode; readNeed?: AccessCode } = {}): Promise<NextResponse | null> {
  try {
    const session = await getSession();
    if (!session) return null; // the route's own auth check answers (401)
    const need = opts.need ?? needForMethod(method, opts.readNeed ?? "R");
    // Cheap exit: no member record means no matrix roles.
    if (!session.memberId) return null;
    const db = await getDatabase();
    const access = await accessForSession(db, session);
    const d = decideArea(access, session.role, area, need);
    if (d.allowed) return null;
    return NextResponse.json(
      { error: d.code === "-" ? "You don't have access to this area" : "Your role doesn't allow this action here" },
      { status: 403 },
    );
  } catch (e) {
    // Never take an API down because the access lookup failed; the route's own checks still apply.
    console.error("areaGuard error:", e);
    return null;
  }
}
