/**
 * GET /api/admin/role-requests
 *
 * List role requests visible to the authenticated admin.
 * Scope rules:
 *   super-admin        → sees everything
 *   association-admin  → sees requests for their association + all clubs within it
 *   club-admin         → sees requests scoped to their club only
 *   assoc-registrar    → same as association-admin (registrations focus)
 *   registrar          → same as club-admin
 *
 * Query params (all optional):
 *   status   — filter by status (pending_payment | awaiting_approval | approved | rejected | withdrawn)
 *   scopeId  — filter by specific club/association id
 *   role     — filter by requested role
 *   season   — filter by seasonYear
 *   page     — pagination (default 1)
 *   limit    — page size (default 20, max 100)
 */

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";
import type { Filter } from "mongodb";

const ADMIN_ROLES = [
  "super-admin",
  "association-admin", "assoc-registrar",
  "club-admin", "registrar",
];

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const role = session.role;
    const scopedRoles = session.scopedRoles ?? [];

    // Must be an admin of some kind
    const isAdmin = ADMIN_ROLES.includes(role) ||
      scopedRoles.some((sr) => ADMIN_ROLES.includes(sr.role));

    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const statusFilter  = searchParams.get("status");
    const scopeIdFilter = searchParams.get("scopeId");
    const roleFilter    = searchParams.get("role");
    const seasonFilter  = searchParams.get("season");
    const page          = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit         = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));

    const client = await clientPromise;
    const db = client.db("hockey-app");

    // ── Build the scope filter based on caller's role ──────────────────────────
    const query: Filter<Record<string, unknown>> = {};

    if (role === "super-admin") {
      // No scope restriction
    } else if (role === "association-admin" || role === "assoc-registrar") {
      // Their association + any club within it
      if (session.associationId) {
        // Clubs under this association
        const clubs = await db
          .collection("clubs")
          .find({ parentAssociationId: session.associationId }, { projection: { id: 1 } })
          .toArray();
        const clubIds = clubs.map((c) => c.id).filter(Boolean);

        query.$or = [
          { scopeId: session.associationId },
          { scopeId: { $in: clubIds } },
        ];
      }
    } else if (role === "club-admin" || role === "registrar") {
      if (session.clubId) {
        query.scopeId = session.clubId;
      }
    } else {
      // Multi-role admin — union of all scopes they hold
      const adminScopeIds = scopedRoles
        .filter((sr) => ADMIN_ROLES.includes(sr.role) && sr.scopeId)
        .map((sr) => sr.scopeId!);

      if (adminScopeIds.length > 0) {
        query.scopeId = { $in: adminScopeIds };
      }
    }

    // ── Apply optional query-string filters ────────────────────────────────────
    if (statusFilter) query.status = statusFilter;
    if (scopeIdFilter) query.scopeId = scopeIdFilter;
    if (roleFilter)   query.requestedRole = roleFilter;
    if (seasonFilter) query.seasonYear = seasonFilter;

    const skip = (page - 1) * limit;
    const [requests, total] = await Promise.all([
      db.collection("role_requests")
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      db.collection("role_requests").countDocuments(query),
    ]);

    return NextResponse.json({
      requests,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error: unknown) {
    console.error("💥 admin/role-requests GET error:", error);
    return NextResponse.json({ error: "Failed to fetch role requests" }, { status: 500 });
  }
}
