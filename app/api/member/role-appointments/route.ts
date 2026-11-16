/**
 * Role appointments.
 *   GET  ?box=inbox (default) → invitations sent to me (pending first)
 *        ?box=sent            → invitations I sent
 *        ?box=org             → everything in my organisation (needs Users & Roles read, or a legacy admin)
 *   POST { roleKey, memberId, teamIds?, ageGroups?, repSquadIds?, fixtureIds?, season?, message? } → invite
 * The role itself is only created when the nominee accepts (see [id]/route.ts).
 */

import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";
import { resolveSessionMemberId } from "@/lib/auth/sessionMember";
import { effectiveAccess } from "@/lib/access/memberAccess";
import { getMatrixRole, codeAtLeast } from "@/lib/access/matrix";
import { canAppoint, missingScope, cleanIds, hasHolding, type RoleAppointment } from "@/lib/access/appointments";

const COLLECTION = "role_appointments";

const nameOf = (m: any) => `${m?.personalInfo?.firstName ?? ""} ${m?.personalInfo?.lastName ?? ""}`.trim();

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const db = await getDatabase();
    const me = await resolveSessionMemberId(db, session);
    const box = new URL(request.url).searchParams.get("box") ?? "inbox";

    let filter: Record<string, unknown>;
    if (box === "sent") filter = { sentByMemberId: me };
    else if (box === "org") {
      const access = await effectiveAccess(db, session);
      if (access.context.kind !== "org" || !(codeAtLeast(access.areas.usersRoles, "R") || access.synthetic)) {
        return NextResponse.json({ error: "Not permitted" }, { status: 403 });
      }
      filter = { orgType: access.context.orgType, orgId: access.context.orgId };
    } else {
      if (!me) return NextResponse.json({ appointments: [] });
      filter = { memberId: me };
    }

    const appointments = await db.collection(COLLECTION).find(filter, { projection: { _id: 0 } }).sort({ createdAt: -1 }).limit(200).toArray();
    const withRole = (appointments as unknown as RoleAppointment[]).map((a) => ({ ...a, roleName: getMatrixRole(String(a.roleKey))?.name ?? a.roleKey, blueCardRequired: getMatrixRole(String(a.roleKey))?.blueCardRequired ?? false }));
    // Pending first.
    withRole.sort((a, b) => Number(b.status === "pending") - Number(a.status === "pending"));
    return NextResponse.json({ appointments: withRole });
  } catch (e) {
    console.error("role-appointments GET error:", e);
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

    const db = await getDatabase();
    const role = getMatrixRole(String(body.roleKey ?? ""));
    if (!role) return NextResponse.json({ error: "Unknown role" }, { status: 400 });

    const access = await effectiveAccess(db, session);
    const verdict = canAppoint({ access, isSuperAdmin: session.role === "super-admin" }, role);
    if (!verdict.ok) return NextResponse.json({ error: verdict.reason }, { status: 403 });
    if (access.context.kind !== "org") return NextResponse.json({ error: "Choose a club or association first" }, { status: 400 });

    const target = await db.collection("members").findOne(
      { memberId: String(body.memberId ?? "") },
      { projection: { memberId: 1, personalInfo: 1, roleHoldings: 1 } },
    );
    if (!target) return NextResponse.json({ error: "Member not found" }, { status: 404 });

    const orgId = access.context.orgId;
    if (hasHolding((target.roleHoldings as any[]) ?? [], role.key, orgId)) {
      return NextResponse.json({ error: "They already hold this role" }, { status: 409 });
    }
    const dup = await db.collection(COLLECTION).findOne({ memberId: target.memberId, roleKey: role.key, orgId, status: "pending" });
    if (dup) return NextResponse.json({ error: "There is already a pending invitation for this role" }, { status: 409 });

    const scope = {
      teamIds: cleanIds(body.teamIds), ageGroups: cleanIds(body.ageGroups),
      repSquadIds: cleanIds(body.repSquadIds), fixtureIds: cleanIds(body.fixtureIds),
    };
    const missing = missingScope(role, scope);
    if (missing) return NextResponse.json({ error: missing }, { status: 400 });

    const me = await resolveSessionMemberId(db, session);
    const now = new Date().toISOString();
    const appointment: RoleAppointment = {
      appointmentId: `APT-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      roleKey: role.key,
      orgType: access.context.orgType,
      orgId,
      memberId: String(target.memberId),
      memberName: nameOf(target),
      ...(me ? { sentByMemberId: me } : {}),
      sentByName: session.name,
      ...Object.fromEntries(Object.entries(scope).filter(([, v]) => v)),
      season: String(body.season ?? new Date().getFullYear()).slice(0, 9),
      ...(body.message ? { message: String(body.message).slice(0, 500) } : {}),
      status: "pending",
      createdAt: now,
    };
    await db.collection(COLLECTION).insertOne({ ...appointment });
    return NextResponse.json({ success: true, appointment }, { status: 201 });
  } catch (e) {
    console.error("role-appointments POST error:", e);
    return NextResponse.json({ error: "Failed to send invitation" }, { status: 500 });
  }
}
