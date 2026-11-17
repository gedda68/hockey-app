/**
 * GET /api/member/my-appointments
 * The roles I hold (current and past) and every invitation sent to me. Scoped to the signed-in member.
 */

import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";
import { resolveSessionMemberId } from "@/lib/auth/sessionMember";
import { getMatrixRole, type RoleHolding } from "@/lib/access/matrix";
import { holdingState, byState } from "@/lib/member/myAppointments";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const db = await getDatabase();
    const me = await resolveSessionMemberId(db, session);
    if (!me) return NextResponse.json({ holdings: [], invitations: [] });

    const member = await db.collection("members").findOne({ memberId: me }, { projection: { roleHoldings: 1 } });
    const raw = (Array.isArray(member?.roleHoldings) ? member!.roleHoldings : []) as (RoleHolding & Record<string, unknown>)[];

    const clubIds = [...new Set(raw.filter((h) => h.orgType === "club").map((h) => h.orgId))];
    const assocIds = [...new Set(raw.filter((h) => h.orgType === "association").map((h) => h.orgId))];
    const [clubs, assocs] = await Promise.all([
      clubIds.length ? db.collection("clubs").find({ $or: [{ id: { $in: clubIds } }, { clubId: { $in: clubIds } }] }, { projection: { id: 1, clubId: 1, name: 1 } }).toArray() : [],
      assocIds.length ? db.collection("associations").find({ $or: [{ associationId: { $in: assocIds } }, { id: { $in: assocIds } }] }, { projection: { id: 1, associationId: 1, name: 1, fullName: 1 } }).toArray() : [],
    ]);
    const orgName = new Map<string, string>();
    for (const c of clubs as any[]) { if (c.id) orgName.set(`club:${c.id}`, c.name); if (c.clubId) orgName.set(`club:${c.clubId}`, c.name); }
    for (const a of assocs as any[]) { const n = a.fullName || a.name; if (a.id) orgName.set(`association:${a.id}`, n); if (a.associationId) orgName.set(`association:${a.associationId}`, n); }

    const holdings = raw
      .filter((h) => h && typeof h.roleKey === "string")
      .map((h) => ({
        roleKey: h.roleKey,
        roleName: getMatrixRole(h.roleKey)?.name ?? h.roleKey,
        orgType: h.orgType,
        orgId: h.orgId,
        orgName: orgName.get(`${h.orgType}:${h.orgId}`) ?? h.orgId,
        teamIds: h.teamIds ?? [],
        ageGroups: h.ageGroups ?? [],
        season: h.season ?? null,
        expiresAt: h.expiresAt ?? null,
        endedAt: (h.endedAt as string | undefined) ?? null,
        acceptedAt: (h.acceptedAt as string | undefined) ?? null,
        fromOlderRole: h.source === "legacy-migration",
        state: holdingState(h),
      }))
      .sort(byState);

    const invites = await db.collection("role_appointments").find({ memberId: me }, { projection: { _id: 0 } }).sort({ createdAt: -1 }).limit(100).toArray();
    const invitations = (invites as any[]).map((a) => ({ ...a, roleName: getMatrixRole(String(a.roleKey))?.name ?? a.roleKey }));
    return NextResponse.json({ holdings, invitations });
  } catch (e) {
    console.error("my-appointments GET error:", e);
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }
}
