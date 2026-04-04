/**
 * POST /api/admin/roles/expire
 *
 * Scans all member role assignments and marks those where expiresAt < now
 * as active: false. This is the proactive cleanup step — the session/login
 * already filters expired roles out of JWTs, but the DB records remain
 * active:true until this runs.
 *
 * Scope: super-admin only (or association-admin for their association's clubs).
 *
 * Body (optional):
 *   { dryRun?: boolean }  — if true, returns what would be changed without writing
 *
 * Response:
 *   { deactivated: number, dryRun: boolean, details: DeactivatedRole[] }
 */

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";
import { ROLE_DEFINITIONS } from "@/lib/types/roles";
import type { RoleAssignment } from "@/lib/types/roles";

const ALLOWED_ROLES = ["super-admin", "association-admin"];

interface DeactivatedRole {
  memberId: string;
  memberName: string;
  role: string;
  scopeName?: string;
  expiresAt: string;
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !ALLOWED_ROLES.includes(session.role)) {
    return NextResponse.json({ error: "Unauthorized — super-admin or association-admin required" }, { status: 401 });
  }

  let dryRun = false;
  try {
    const body = await req.json();
    dryRun = body.dryRun === true;
  } catch {
    // body is optional
  }

  const client = await clientPromise;
  const db = client.db("hockey-app");
  const now = new Date();

  // Build scope filter
  const memberFilter: Record<string, unknown> = {
    "roles.expiresAt": { $lt: now.toISOString() },
    "roles.active": { $ne: false },
  };

  if (session.role === "association-admin" && session.associationId) {
    const clubs = await db
      .collection("clubs")
      .find({ parentAssociationId: session.associationId })
      .project({ id: 1 })
      .toArray();
    const clubIds = clubs.map((c) => c.id as string);
    memberFilter["roles.scopeId"] = { $in: [session.associationId, ...clubIds] };
  }

  const members = await db
    .collection("members")
    .find(memberFilter)
    .project({ memberId: 1, "personalInfo.firstName": 1, "personalInfo.lastName": 1, roles: 1 })
    .toArray();

  const deactivated: DeactivatedRole[] = [];

  for (const member of members) {
    const roles = (member.roles ?? []) as RoleAssignment[];
    const name = `${member.personalInfo?.firstName ?? ""} ${member.personalInfo?.lastName ?? ""}`.trim();
    let changed = false;

    const updatedRoles = roles.map((r) => {
      if (
        r.expiresAt &&
        new Date(r.expiresAt) < now &&
        r.active !== false &&
        ROLE_DEFINITIONS[r.role]?.seasonalRegistration
      ) {
        deactivated.push({
          memberId:   member.memberId as string,
          memberName: name,
          role:       r.role,
          scopeName:  r.scopeName,
          expiresAt:  r.expiresAt,
        });
        changed = true;
        return { ...r, active: false };
      }
      return r;
    });

    if (!dryRun && changed) {
      await db.collection("members").updateOne(
        { memberId: member.memberId },
        { $set: { roles: updatedRoles, updatedAt: now } }
      );
    }
  }

  return NextResponse.json({
    deactivated: deactivated.length,
    dryRun,
    details: deactivated,
  });
}
