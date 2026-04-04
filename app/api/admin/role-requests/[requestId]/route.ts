/**
 * /api/admin/role-requests/[requestId]
 *
 * PATCH — update a request:
 *   action: "approve"        → approve, write RoleAssignment, mark approved
 *   action: "reject"         → reject with mandatory reviewNotes
 *   action: "record_payment" → record fee payment, advance to awaiting_approval
 *   action: "withdraw"       → requester or admin cancels the request
 *
 * GET — fetch a single request by requestId (for the detail/review modal).
 *
 * Scope enforcement:
 *   Only admins whose scope covers the request's scopeId may act on it.
 *   super-admin can act on everything.
 */

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";
import { ROLE_DEFINITIONS } from "@/lib/types/roles";
import type { RoleAssignment, ScopeType } from "@/lib/types/roles";
import type {
  RoleRequest,
  ApproveRoleRequestBody,
  RejectRoleRequestBody,
  RecordPaymentBody,
} from "@/types/roleRequests";

// ── Scope check helpers ───────────────────────────────────────────────────────

/**
 * Returns true if the session holder has admin authority over the given scopeId.
 * Used to prevent cross-club/cross-association approval.
 */
async function callerCanActOnRequest(
  session: Awaited<ReturnType<typeof getSession>>,
  req: RoleRequest,
  db: Awaited<ReturnType<typeof (await import("@/lib/mongodb")).default.then(c => Promise.resolve(c.db("hockey-app")))>>
): Promise<boolean> {
  if (!session) return false;
  if (session.role === "super-admin") return true;

  const scopedRoles = session.scopedRoles ?? [];

  // Check primary role scope
  const primaryOk = await checkRoleScope(session.role, session, req, db);
  if (primaryOk) return true;

  // Check any scoped role
  for (const sr of scopedRoles) {
    if (await checkRoleScope(sr.role, { ...session, clubId: sr.scopeId, associationId: sr.scopeId }, req, db)) {
      return true;
    }
  }

  return false;
}

async function checkRoleScope(
  role: string,
  session: { associationId?: string | null; clubId?: string | null },
  req: RoleRequest,
  db: Parameters<typeof callerCanActOnRequest>[2]
): Promise<boolean> {
  if (role === "super-admin") return true;

  if (["association-admin", "assoc-registrar"].includes(role)) {
    if (!session.associationId) return false;
    // Direct association match
    if (req.scopeId === session.associationId) return true;
    // Club under this association
    if (req.scopeType === "club" && req.scopeId) {
      const club = await db.collection("clubs").findOne({ id: req.scopeId });
      return club?.parentAssociationId === session.associationId;
    }
  }

  if (["club-admin", "registrar"].includes(role)) {
    return req.scopeType === "club" && req.scopeId === session.clubId;
  }

  return false;
}

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

    const { requestId } = await params;
    const client = await clientPromise;
    const db = client.db("hockey-app");

    const req = await db.collection("role_requests").findOne({ requestId }) as RoleRequest | null;
    if (!req) return NextResponse.json({ error: "Request not found" }, { status: 404 });

    const canAct = await callerCanActOnRequest(session, req, db);
    const isSelf = session.userId === req.memberId || session.memberId === req.memberId;

    if (!canAct && !isSelf) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ request: req });
  } catch (error: unknown) {
    console.error("💥 role-requests GET error:", error);
    return NextResponse.json({ error: "Failed to fetch request" }, { status: 500 });
  }
}

// ── PATCH ─────────────────────────────────────────────────────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

    const { requestId } = await params;
    const body = await request.json();
    const { action } = body as { action: string };

    if (!["approve", "reject", "record_payment", "withdraw"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("hockey-app");

    const req = await db.collection("role_requests").findOne({ requestId }) as RoleRequest | null;
    if (!req) return NextResponse.json({ error: "Request not found" }, { status: 404 });

    // Already terminal?
    if (["approved", "rejected", "withdrawn"].includes(req.status)) {
      return NextResponse.json(
        { error: `Request is already ${req.status} and cannot be modified` },
        { status: 409 }
      );
    }

    const now = new Date().toISOString();

    // ── WITHDRAW ──────────────────────────────────────────────────────────────
    if (action === "withdraw") {
      const isSelf  = session.userId === req.memberId || session.memberId === req.memberId;
      const isAdmin = await callerCanActOnRequest(session, req, db);
      if (!isSelf && !isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

      await db.collection("role_requests").updateOne(
        { requestId },
        { $set: { status: "withdrawn", updatedAt: now } }
      );
      return NextResponse.json({ message: "Request withdrawn" });
    }

    // All remaining actions require admin scope
    const canAct = await callerCanActOnRequest(session, req, db);
    if (!canAct) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // ── RECORD PAYMENT ────────────────────────────────────────────────────────
    if (action === "record_payment") {
      if (req.status !== "pending_payment") {
        return NextResponse.json(
          { error: "Payment can only be recorded on requests in pending_payment status" },
          { status: 409 }
        );
      }

      const { paymentId, amountCents, paymentDate } = body as RecordPaymentBody;
      if (!paymentId || !amountCents || !paymentDate) {
        return NextResponse.json(
          { error: "paymentId, amountCents, and paymentDate are required" },
          { status: 400 }
        );
      }

      await db.collection("role_requests").updateOne(
        { requestId },
        {
          $set: {
            feePaid: true,
            paymentId,
            paymentDate,
            status: "awaiting_approval",
            updatedAt: now,
          },
        }
      );

      return NextResponse.json({
        message: "Payment recorded. Request is now awaiting admin approval.",
        status: "awaiting_approval",
      });
    }

    // ── REJECT ────────────────────────────────────────────────────────────────
    if (action === "reject") {
      const { reviewNotes } = body as RejectRoleRequestBody;
      if (!reviewNotes?.trim()) {
        return NextResponse.json(
          { error: "reviewNotes is required when rejecting a request" },
          { status: 400 }
        );
      }

      await db.collection("role_requests").updateOne(
        { requestId },
        {
          $set: {
            status: "rejected",
            reviewedAt: now,
            reviewedBy: session.userId,
            reviewedByName: session.name,
            reviewerRole: session.role,
            reviewNotes: reviewNotes.trim(),
            updatedAt: now,
          },
        }
      );

      return NextResponse.json({ message: "Request rejected", status: "rejected" });
    }

    // ── APPROVE ───────────────────────────────────────────────────────────────
    if (action === "approve") {
      // Cannot approve if fee hasn't been paid (unless admin explicitly waives it)
      const { reviewNotes, waiveFee } = body as ApproveRoleRequestBody;
      if (req.requiresFee && !req.feePaid && !waiveFee) {
        return NextResponse.json(
          { error: "Fee must be paid (or waived) before this request can be approved" },
          { status: 409 }
        );
      }

      if (req.status !== "awaiting_approval" && !(req.requiresFee && waiveFee)) {
        return NextResponse.json(
          { error: "Request is not in awaiting_approval status" },
          { status: 409 }
        );
      }

      // ── Write the RoleAssignment to the member/user's roles[] ──────────────
      const roleDef = ROLE_DEFINITIONS[req.requestedRole];
      const assignment: RoleAssignment = {
        role: req.requestedRole,
        scopeType: req.scopeType as ScopeType,
        ...(req.scopeId   ? { scopeId: req.scopeId }     : {}),
        ...(req.scopeName ? { scopeName: req.scopeName }  : {}),
        grantedAt: now,
        grantedBy: session.userId,
        ...(req.seasonYear && roleDef?.seasonalRegistration
          ? { expiresAt: `${req.seasonYear}-12-31T23:59:59.000Z` }
          : {}),
        ...(req.notes ? { notes: req.notes } : {}),
        active: true,
      };

      const targetCollection = req.accountType === "user" ? "users" : "members";
      const idField = req.accountType === "user" ? "userId" : "memberId";

      const updateResult = await db.collection(targetCollection).updateOne(
        { [idField]: req.memberId },
        { $push: { roles: assignment as unknown as Record<string, unknown> } }
      );

      if (updateResult.matchedCount === 0) {
        return NextResponse.json(
          { error: "Target member/user not found — role assignment failed" },
          { status: 404 }
        );
      }

      // Mark request as approved
      await db.collection("role_requests").updateOne(
        { requestId },
        {
          $set: {
            status: "approved",
            reviewedAt: now,
            reviewedBy: session.userId,
            reviewedByName: session.name,
            reviewerRole: session.role,
            ...(reviewNotes ? { reviewNotes } : {}),
            ...(waiveFee    ? { feePaid: true } : {}),
            roleAssignmentCreatedAt: now,
            updatedAt: now,
          },
        }
      );

      return NextResponse.json({
        message: `Role "${req.requestedRole}" approved and assigned to ${req.memberName}.`,
        status: "approved",
      });
    }

    return NextResponse.json({ error: "Unhandled action" }, { status: 400 });
  } catch (error: unknown) {
    console.error("💥 role-requests PATCH error:", error);
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}
