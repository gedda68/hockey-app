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
import { requirePermission } from "@/lib/auth/middleware";
import { ROLE_DEFINITIONS } from "@/lib/types/roles";
import type { RoleAssignment, ScopeType } from "@/lib/types/roles";
import type {
  RoleRequest,
  FeeWaiver,
  ApproveRoleRequestBody,
  RejectRoleRequestBody,
  RecordPaymentBody,
} from "@/types/roleRequests";
import type { Db } from "mongodb";
import { sendEmail } from "@/lib/email/client";
import { buildRoleRequestDecisionEmail } from "@/lib/email/templates/roleRequestDecision";
import { generateMembershipCardPdf } from "@/lib/member/membershipCardPdf";
import {
  generateTraceId,
  logAdminTelemetry,
  logAdminError,
} from "@/lib/observability/adminTelemetry";
import {
  canApproveRoleRequestPrivilege,
  collectGrantorRolesForRoleRequest,
} from "@/lib/domain/roleGrantWorkflow";

// ── Scope check helpers ───────────────────────────────────────────────────────

/**
 * Returns true if the session holder has admin authority over the given scopeId.
 * Used to prevent cross-club/cross-association approval.
 */
async function callerCanActOnRequest(
  session: Awaited<ReturnType<typeof getSession>>,
  req: RoleRequest,
  db: Db
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
  db: Db
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

// ── Email helper ─────────────────────────────────────────────────────────────

/**
 * Looks up the email address and first name for a role request's subject.
 * Returns null values when the record cannot be found.
 */
async function getRecipientInfo(
  db: Db,
  req: RoleRequest
): Promise<{ email: string | null; firstName: string }> {
  if (req.accountType === "user") {
    const user = await db
      .collection("users")
      .findOne({ userId: req.memberId }, { projection: { email: 1, firstName: 1, name: 1 } });
    return {
      email:     user?.email ?? null,
      firstName: user?.firstName ?? user?.name ?? req.memberName ?? "there",
    };
  }
  const member = await db
    .collection("members")
    .findOne(
      { memberId: req.memberId },
      { projection: { "contact.primaryEmail": 1, "personalInfo.firstName": 1 } }
    );
  return {
    email:     member?.contact?.primaryEmail ?? null,
    firstName: member?.personalInfo?.firstName ?? req.memberName ?? "there",
  };
}

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  const traceId = generateTraceId();
  try {
    const { response } = await requirePermission(_request, "registration.manage");
    if (response) return response;

    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

    const { requestId } = await params;
    const client = await clientPromise;
    const db = client.db();

    const req = await db.collection("role_requests").findOne({ requestId }) as RoleRequest | null;
    if (!req) return NextResponse.json({ error: "Request not found" }, { status: 404 });

    const canAct = await callerCanActOnRequest(session, req, db);
    const isSelf = session.userId === req.memberId || session.memberId === req.memberId;

    if (!canAct && !isSelf) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ request: req });
  } catch (error: unknown) {
    logAdminError("admin.role_request.get.error", traceId, error);
    return NextResponse.json({ error: "Failed to fetch request" }, { status: 500 });
  }
}

// ── PATCH ─────────────────────────────────────────────────────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  const traceId = generateTraceId();
  try {
    const { response } = await requirePermission(request, "registration.manage");
    if (response) return response;

    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

    const { requestId } = await params;
    const body = await request.json();
    const { action } = body as { action: string };

    if (!["approve", "reject", "record_payment", "withdraw"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();

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
      logAdminTelemetry("admin.role_request.withdraw", {
        traceId,
        requestId,
        memberId:      req.memberId,
        requestedRole: req.requestedRole,
        actorId:       session.userId,
        actorRole:     session.role,
        byself:        isSelf,
      });
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

      logAdminTelemetry("admin.role_request.record_payment", {
        traceId,
        requestId,
        memberId:      req.memberId,
        requestedRole: req.requestedRole,
        paymentId,
        amountCents,
        recordedBy:    session.userId,
        actorRole:     session.role,
      });
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

      // ── Send rejection email (fire-and-forget) ────────────────────────────
      getRecipientInfo(db, req).then(({ email, firstName }) => {
        if (!email) return;
        const roleLabel = ROLE_DEFINITIONS[req.requestedRole]?.label ?? req.requestedRole;
        const { subject, html, text } = buildRoleRequestDecisionEmail({
          firstName,
          decision:    "rejected",
          roleLabel,
          scopeName:   req.scopeName,
          seasonYear:  req.seasonYear,
          approverName: session.name ?? session.email,
          reviewNotes: reviewNotes.trim(),
        });
        sendEmail({ to: email, subject, html, text }).catch((err) =>
          logAdminError("admin.role_request.reject.email_error", traceId, err, { requestId })
        );
      }).catch((err) => logAdminError("admin.role_request.reject.recipient_lookup_error", traceId, err, { requestId }));

      logAdminTelemetry("admin.role_request.reject", {
        traceId,
        requestId,
        memberId:      req.memberId,
        requestedRole: req.requestedRole,
        reviewedBy:    session.userId,
        actorRole:     session.role,
      });
      return NextResponse.json({ message: "Request rejected", status: "rejected" });
    }

    // ── APPROVE ───────────────────────────────────────────────────────────────
    if (action === "approve") {
      const { reviewNotes, waiveFee, waiverReason } = body as ApproveRoleRequestBody;

      // ── Fee gate ───────────────────────────────────────────────────────────
      if (req.requiresFee && !req.feePaid) {
        if (!waiveFee) {
          return NextResponse.json(
            { error: "Fee must be paid before this request can be approved. To skip payment, set waiveFee: true and supply a waiverReason." },
            { status: 409 }
          );
        }

        // Waiver requested — reason is mandatory, must be substantive
        if (!waiverReason || waiverReason.trim().length < 10) {
          return NextResponse.json(
            { error: "waiverReason is required when waiving a fee and must be a substantive explanation (min 10 characters)." },
            { status: 400 }
          );
        }
      }

      if (req.status !== "awaiting_approval" && !(req.requiresFee && waiveFee)) {
        return NextResponse.json(
          { error: "Request is not in awaiting_approval status" },
          { status: 409 }
        );
      }

      const grantorRoles = await collectGrantorRolesForRoleRequest(session, db, req);
      if (!canApproveRoleRequestPrivilege(grantorRoles, req.requestedRole)) {
        return NextResponse.json(
          {
            error:
              "You cannot approve this role. Use a club or association administrator, or someone with a more senior role than the one requested in this organisation.",
          },
          { status: 403 },
        );
      }

      // ── Build the fee waiver audit record (if applicable) ─────────────────
      const feeWaiver: FeeWaiver | undefined =
        waiveFee && req.requiresFee && !req.feePaid
          ? {
              grantedBy:      session.userId,
              grantedByName:  session.name,
              grantedByRole:  session.role,
              grantedByScope: session.clubName ?? session.associationId ?? "global",
              grantedAt:      now,
              reason:         waiverReason!.trim(),
            }
          : undefined;

      // ── Write the RoleAssignment to the member/user's roles[] ──────────────
      const roleDef = ROLE_DEFINITIONS[req.requestedRole];
      const assignment: RoleAssignment = {
        role: req.requestedRole,
        scopeType: req.scopeType as ScopeType,
        ...(req.scopeId   ? { scopeId: req.scopeId }    : {}),
        ...(req.scopeName ? { scopeName: req.scopeName } : {}),
        grantedAt: now,
        grantedBy: session.userId,
        ...(req.seasonYear ? { seasonYear: req.seasonYear } : {}),
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
        { $push: { roles: assignment } } as unknown as import("mongodb").UpdateFilter<
          import("mongodb").Document
        >,
      );

      if (updateResult.matchedCount === 0) {
        return NextResponse.json(
          { error: "Target member/user not found — role assignment failed" },
          { status: 404 }
        );
      }

      // ── Mark request as approved — include waiver record if present ─────────
      await db.collection("role_requests").updateOne(
        { requestId },
        {
          $set: {
            status: "approved",
            reviewedAt: now,
            reviewedBy: session.userId,
            reviewedByName: session.name,
            reviewerRole: session.role,
            ...(reviewNotes ? { reviewNotes }          : {}),
            ...(feeWaiver   ? { feeWaiver, feePaid: true } : {}),
            roleAssignmentCreatedAt: now,
            updatedAt: now,
          },
        }
      );

      // ── Send approval email (fire-and-forget) ─────────────────────────────
      getRecipientInfo(db, req).then(({ email, firstName }) => {
        if (!email) return;
        const roleLabel = ROLE_DEFINITIONS[req.requestedRole]?.label ?? req.requestedRole;
        const { subject, html, text } = buildRoleRequestDecisionEmail({
          firstName,
          decision:    "approved",
          roleLabel,
          scopeName:   req.scopeName,
          seasonYear:  req.seasonYear,
          approverName: session.name ?? session.email,
          reviewNotes: reviewNotes,
          feeWaived:   !!feeWaiver,
        });
        (async () => {
          const attachments: Array<{ filename: string; content: Uint8Array; contentType: string }> = [];
          try {
            if (req.accountType === "member" && req.seasonYear) {
              const member = await db.collection("members").findOne(
                { memberId: req.memberId },
                { projection: { memberId: 1, clubId: 1, personalInfo: 1 } },
              );

              if (member) {
                const clubId = String((member as any).clubId ?? "").trim();
                const club = clubId
                  ? await db.collection("clubs").findOne({ id: clubId }, { projection: { name: 1, shortName: 1 } })
                  : null;
                const clubName = club ? String((club as any).shortName ?? (club as any).name ?? "").trim() : "";

                const pi = (member as any).personalInfo ?? {};
                const displayName =
                  String(pi.displayName ?? "").trim() ||
                  `${String(pi.firstName ?? "").trim()} ${String(pi.lastName ?? "").trim()}`.trim() ||
                  String((member as any).memberId ?? "");
                const photoUrl = (pi.photoUrl != null ? String(pi.photoUrl) : "").trim() || null;

                const pdf = await generateMembershipCardPdf({
                  memberId: String((member as any).memberId ?? req.memberId),
                  displayName,
                  clubName,
                  roleLabel,
                  seasonYear: req.seasonYear,
                  photoUrl,
                });

                attachments.push({
                  filename: pdf.filename,
                  content: pdf.bytes,
                  contentType: "application/pdf",
                });
              }
            }
          } catch (e) {
            logAdminError("admin.role_request.approve.pdf_error", traceId, e, { requestId });
          }

          await sendEmail({ to: email, subject, html, text, attachments }).catch((err) =>
            logAdminError("admin.role_request.approve.email_error", traceId, err, { requestId }),
          );
        })().catch((err) => logAdminError("admin.role_request.approve.email_task_error", traceId, err, { requestId }));
      }).catch((err) => logAdminError("admin.role_request.approve.recipient_lookup_error", traceId, err, { requestId }));

      logAdminTelemetry("admin.role_request.approve", {
        traceId,
        requestId,
        memberId:      req.memberId,
        requestedRole: req.requestedRole,
        scopeType:     req.scopeType,
        scopeId:       req.scopeId ?? null,
        seasonYear:    req.seasonYear ?? null,
        reviewedBy:    session.userId,
        actorRole:     session.role,
        feeWaived:     !!feeWaiver,
      });
      return NextResponse.json({
        message: `Role "${req.requestedRole}" approved and assigned to ${req.memberName}.`,
        status: "approved",
        ...(feeWaiver ? { feeWaived: true } : {}),
      });
    }

    return NextResponse.json({ error: "Unhandled action" }, { status: 400 });
  } catch (error: unknown) {
    logAdminError("admin.role_request.patch.error", traceId, error);
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}
