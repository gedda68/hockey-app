/**
 * GET /api/admin/roles/expiring
 *
 * Returns role assignments that are expiring soon or already expired,
 * scoped to what the calling admin can see.
 *
 * Query params:
 *   days?     — warn window in days (default 60)
 *   clubId?   — filter to a specific club (super-admin / assoc-admin only)
 *   assocId?  — filter to a specific association's clubs
 *   format?   — "json" (default) | "csv"  — CSV triggers a file download
 *
 * JSON response:
 *   {
 *     expiringSoon: RoleExpirySummary[]
 *     expired: RoleExpirySummary[]
 *     totalExpiringSoon: number
 *     totalExpired: number
 *   }
 *
 * CSV response:
 *   Attachment download — "role-expiry.csv"
 *   Columns: status, memberId, memberName, email, role, roleLabel, scopeId,
 *            scopeName, seasonYear, expiresAt, daysUntilExpiry
 */

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/middleware";
import { ROLE_DEFINITIONS } from "@/lib/types/roles";
import type { RoleAssignment } from "@/lib/types/roles";

const ADMIN_ROLES = [
  "super-admin",
  "association-admin",
  "assoc-registrar",
  "club-admin",
  "registrar",
];

export interface RoleExpirySummary {
  memberId: string;
  memberName: string;
  email?: string;
  role: string;
  roleLabel: string;
  scopeId?: string;
  scopeName?: string;
  seasonYear?: string;
  expiresAt: string;
  daysUntilExpiry: number; // negative = already expired
  active: boolean;
}

export async function GET(req: NextRequest) {
  const { response } = await requirePermission(req, "registration.manage");
  if (response) return response;

  const session = await getSession();
  if (!session || !ADMIN_ROLES.includes(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const days    = parseInt(searchParams.get("days") ?? "60", 10);
  const clubId  = searchParams.get("clubId")  ?? undefined;
  const assocId = searchParams.get("assocId") ?? undefined;
  const format  = searchParams.get("format")  ?? "json";

  const client = await clientPromise;
  const db = client.db("hockey-app");

  const now = new Date();
  const warnThreshold = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  // Build scope filter for the member query
  const memberFilter: Record<string, unknown> = {
    // Only members who have at least one role with an expiresAt
    "roles.expiresAt": { $exists: true },
  };

  // Scope restriction
  if (session.role === "club-admin" || session.role === "registrar") {
    memberFilter["roles.scopeId"] = session.clubId;
  } else if (clubId) {
    memberFilter["roles.scopeId"] = clubId;
  } else if (assocId) {
    // Get all clubs under this association
    const clubs = await db
      .collection("clubs")
      .find({ parentAssociationId: assocId })
      .project({ id: 1 })
      .toArray();
    const clubIds = clubs.map((c) => c.id as string);
    memberFilter["roles.scopeId"] = { $in: [assocId, ...clubIds] };
  } else if (session.role === "association-admin" && session.associationId) {
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
    .project({
      memberId: 1,
      "personalInfo.firstName": 1,
      "personalInfo.lastName": 1,
      "contact.primaryEmail": 1,
      roles: 1,
    })
    .limit(500)
    .toArray();

  const expiringSoon: RoleExpirySummary[] = [];
  const expired: RoleExpirySummary[] = [];

  for (const member of members) {
    const roles = (member.roles ?? []) as RoleAssignment[];
    const name = `${member.personalInfo?.firstName ?? ""} ${member.personalInfo?.lastName ?? ""}`.trim();
    const email = member.contact?.primaryEmail as string | undefined;

    for (const r of roles) {
      if (!r.expiresAt) continue;
      if (!ROLE_DEFINITIONS[r.role]?.seasonalRegistration) continue;

      const expiry = new Date(r.expiresAt);
      const daysUntilExpiry = Math.ceil(
        (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      const summary: RoleExpirySummary = {
        memberId:        member.memberId as string,
        memberName:      name,
        email,
        role:            r.role,
        roleLabel:       ROLE_DEFINITIONS[r.role]?.label ?? r.role,
        scopeId:         r.scopeId,
        scopeName:       r.scopeName,
        seasonYear:      r.seasonYear,
        expiresAt:       r.expiresAt,
        daysUntilExpiry,
        active:          r.active !== false,
      };

      if (expiry < now && r.active !== false) {
        expired.push(summary);
      } else if (expiry <= warnThreshold && expiry >= now) {
        expiringSoon.push(summary);
      }
    }
  }

  // Sort: most urgent first
  expiringSoon.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
  expired.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry); // most recently expired first

  // ── CSV export ──────────────────────────────────────────────────────────────
  if (format === "csv") {
    function csvEscape(s: string): string {
      if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    }

    const header = [
      "status", "memberId", "memberName", "email",
      "role", "roleLabel", "scopeId", "scopeName",
      "seasonYear", "expiresAt", "daysUntilExpiry",
    ].join(",");

    const rows: string[] = [header];

    for (const r of expired) {
      rows.push([
        csvEscape("expired"),
        csvEscape(r.memberId),
        csvEscape(r.memberName),
        csvEscape(r.email ?? ""),
        csvEscape(r.role),
        csvEscape(r.roleLabel),
        csvEscape(r.scopeId ?? ""),
        csvEscape(r.scopeName ?? ""),
        csvEscape(r.seasonYear ?? ""),
        csvEscape(r.expiresAt),
        csvEscape(String(r.daysUntilExpiry)),
      ].join(","));
    }
    for (const r of expiringSoon) {
      rows.push([
        csvEscape("expiring_soon"),
        csvEscape(r.memberId),
        csvEscape(r.memberName),
        csvEscape(r.email ?? ""),
        csvEscape(r.role),
        csvEscape(r.roleLabel),
        csvEscape(r.scopeId ?? ""),
        csvEscape(r.scopeName ?? ""),
        csvEscape(r.seasonYear ?? ""),
        csvEscape(r.expiresAt),
        csvEscape(String(r.daysUntilExpiry)),
      ].join(","));
    }

    return new NextResponse(rows.join("\r\n"), {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="role-expiry-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  }

  return NextResponse.json({
    expiringSoon,
    expired,
    totalExpiringSoon: expiringSoon.length,
    totalExpired: expired.length,
    warnDays: days,
  });
}
