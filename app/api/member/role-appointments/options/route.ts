/** GET /api/member/role-appointments/options — roles the signed-in person may appoint in their current organisation. */
import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";
import { effectiveAccess } from "@/lib/access/memberAccess";
import { appointableRoles } from "@/lib/access/appointments";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const db = await getDatabase();
    const access = await effectiveAccess(db, session);
    const roles = appointableRoles({ access, isSuperAdmin: session.role === "super-admin" });
    return NextResponse.json({
      context: access.context,
      roles: roles.map((r) => ({ key: r.key, name: r.name, category: r.category, level: r.level, scope: r.scope, blueCardRequired: r.blueCardRequired })),
    });
  } catch (e) {
    console.error("role-appointments options error:", e);
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }
}
