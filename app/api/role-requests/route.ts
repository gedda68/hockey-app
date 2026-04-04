/**
 * POST /api/role-requests
 *
 * Submit a role assignment request.
 * Can be called by:
 *   - A member submitting their own registration (player, umpire, volunteer, etc.)
 *   - An admin submitting on behalf of a member
 *
 * The endpoint determines whether a fee is required (from ROLE_DEFINITIONS),
 * then sets the initial status:
 *   fee required  → "pending_payment"
 *   no fee        → "awaiting_approval"
 *
 * GET /api/role-requests?memberId=...
 * List all requests for a given member (for the portal "My Registrations" view).
 */

import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import clientPromise from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";
import { ROLE_DEFINITIONS } from "@/lib/types/roles";
import type { SubmitRoleRequestBody, RoleRequest } from "@/types/roleRequests";

// ── POST — submit a request ───────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body: SubmitRoleRequestBody = await request.json();
    const { memberId, accountType, requestedRole, scopeType, scopeId, seasonYear, notes } = body;

    // ── Validate inputs ────────────────────────────────────────────────────────
    if (!memberId || !accountType || !requestedRole || !scopeType) {
      return NextResponse.json(
        { error: "memberId, accountType, requestedRole, and scopeType are required" },
        { status: 400 }
      );
    }

    const roleDef = ROLE_DEFINITIONS[requestedRole];
    if (!roleDef) {
      return NextResponse.json({ error: "Unknown role" }, { status: 400 });
    }

    if (!roleDef.requiresApproval) {
      return NextResponse.json(
        { error: "This role does not require a request — it is assigned directly" },
        { status: 400 }
      );
    }

    // Validate scopeType is allowed for this role
    if (!roleDef.scopeTypes.includes(scopeType)) {
      return NextResponse.json(
        { error: `Role "${requestedRole}" cannot be scoped to "${scopeType}"` },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("hockey-app");

    // ── Verify the member/user exists ─────────────────────────────────────────
    const collection = accountType === "user" ? "users" : "members";
    const idField     = accountType === "user" ? "userId" : "memberId";
    const account = await db.collection(collection).findOne(
      { [idField]: memberId },
      { projection: { personalInfo: 1, firstName: 1, lastName: 1, username: 1 } }
    );

    if (!account) {
      return NextResponse.json({ error: "Member/user not found" }, { status: 404 });
    }

    const memberName = accountType === "member"
      ? `${account.personalInfo?.firstName ?? ""} ${account.personalInfo?.lastName ?? ""}`.trim()
      : `${account.firstName ?? ""} ${account.lastName ?? ""}`.trim() || account.username;

    // ── Check for a duplicate in-flight request ────────────────────────────────
    const duplicate = await db.collection("role_requests").findOne({
      memberId,
      requestedRole,
      scopeType,
      ...(scopeId ? { scopeId } : {}),
      ...(seasonYear ? { seasonYear } : {}),
      status: { $in: ["pending_payment", "awaiting_approval"] },
    });

    if (duplicate) {
      return NextResponse.json(
        { error: "An open request for this role already exists", existingRequestId: duplicate.requestId },
        { status: 409 }
      );
    }

    // ── Resolve scope name for display ────────────────────────────────────────
    let scopeName: string | undefined;
    if (scopeId) {
      if (scopeType === "club") {
        const club = await db.collection("clubs").findOne(
          { $or: [{ id: scopeId }, { slug: scopeId }] },
          { projection: { name: 1 } }
        );
        scopeName = club?.name;
      } else if (scopeType === "association") {
        const assoc = await db.collection("associations").findOne(
          { associationId: scopeId },
          { projection: { name: 1, fullName: 1 } }
        );
        scopeName = assoc?.fullName ?? assoc?.name;
      }
    }

    // ── Determine initial status ──────────────────────────────────────────────
    const requiresFee = roleDef.requiresFee;
    const status = requiresFee ? "pending_payment" : "awaiting_approval";

    // ── Build and insert the request document ─────────────────────────────────
    const now = new Date().toISOString();
    const roleRequest: RoleRequest = {
      requestId:        `rreq-${uuidv4()}`,
      memberId,
      accountType,
      memberName,
      requestedRole,
      scopeType,
      ...(scopeId    ? { scopeId }    : {}),
      ...(scopeName  ? { scopeName }  : {}),
      ...(seasonYear ? { seasonYear } : {}),
      ...(notes      ? { notes }      : {}),
      requestedBy:     session.userId,
      requestedByName: session.name,
      requestedAt:     now,
      requiresFee,
      feePaid:         false,
      status,
      createdAt:       now,
      updatedAt:       now,
    };

    await db.collection("role_requests").insertOne(roleRequest);

    return NextResponse.json(
      {
        requestId: roleRequest.requestId,
        status,
        requiresFee,
        message: requiresFee
          ? "Request submitted. Please complete fee payment to proceed."
          : "Request submitted and is awaiting admin approval.",
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("💥 role-requests POST error:", error);
    return NextResponse.json({ error: "Failed to submit request" }, { status: 500 });
  }
}

// ── GET — list requests for a member ─────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get("memberId");

    if (!memberId) {
      return NextResponse.json({ error: "memberId is required" }, { status: 400 });
    }

    // Members can only see their own requests; admins can see any
    const adminRoles = ["super-admin", "association-admin", "club-admin", "assoc-registrar", "registrar"];
    const isAdmin = adminRoles.includes(session.role) ||
      (session.scopedRoles ?? []).some((sr) => adminRoles.includes(sr.role));

    if (!isAdmin && session.userId !== memberId && session.memberId !== memberId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const client = await clientPromise;
    const db = client.db("hockey-app");

    const requests = await db
      .collection("role_requests")
      .find({ memberId })
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({ requests });
  } catch (error: unknown) {
    console.error("💥 role-requests GET error:", error);
    return NextResponse.json({ error: "Failed to fetch requests" }, { status: 500 });
  }
}
