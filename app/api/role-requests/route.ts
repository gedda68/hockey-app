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
import { resolveFeeWithFallback, buildFeeDescription } from "@/lib/fees/feeSchedule";
import { calculateGST } from "@/lib/fees/gst";
import type { SubmitRoleRequestBody, RoleRequest } from "@/types/roleRequests";
import type { FeeScheduleEntry } from "@/types/feeSchedule";
import {
  generateTraceId,
  logAdminTelemetry,
  logAdminError,
} from "@/lib/observability/adminTelemetry";

async function isFamilyPrimaryForTarget(
  db: ReturnType<Awaited<typeof clientPromise>["db"]>,
  sessionMemberId: string,
  targetMemberId: string,
): Promise<boolean> {
  const [me, target] = await Promise.all([
    db.collection("members").findOne(
      { memberId: sessionMemberId },
      { projection: { family: 1 } },
    ),
    db.collection("members").findOne(
      { memberId: targetMemberId },
      { projection: { family: 1 } },
    ),
  ]);

  const myFamilyId = String((me as any)?.family?.familyId ?? "").trim();
  const isPrimary = Boolean((me as any)?.family?.isPrimaryContact);
  const targetFamilyId = String((target as any)?.family?.familyId ?? "").trim();
  return !!(myFamilyId && isPrimary && targetFamilyId && myFamilyId === targetFamilyId);
}

// ── POST — submit a request ───────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const traceId = generateTraceId();
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
    const db = client.db();

    // Authorization: members can submit their own requests.
    // Parents/guardians (family primary contact) may submit on behalf of linked members.
    const adminRoles = ["super-admin", "association-admin", "club-admin", "assoc-registrar", "registrar"];
    const isAdmin =
      adminRoles.includes(session.role) ||
      (session.scopedRoles ?? []).some((sr) => adminRoles.includes(sr.role));
    const isSelf = session.userId === memberId || session.memberId === memberId;
    if (!isAdmin && !isSelf) {
      const smid = session.memberId?.trim() || "";
      if (!smid) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const ok = await isFamilyPrimaryForTarget(db, smid, memberId);
      if (!ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

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

    // ── Resolve scope name + fee schedule ────────────────────────────────────
    //
    // For club-scoped roles we load both the club document and its parent
    // association so the fallback chain works:
    //   club feeSchedule → parent association feeSchedule → undefined
    //
    // For association-scoped roles we load only the association document.
    let scopeName: string | undefined;
    let resolvedFeeAmountCents: number | undefined;
    let resolvedFeeDescription: string | undefined;
    let resolvedGstIncluded: boolean | undefined;
    let resolvedGstAmountCents: number | undefined;

    const effectiveSeasonYear = seasonYear ?? String(new Date().getFullYear());

    if (scopeId) {
      if (scopeType === "club") {
        const club = await db.collection("clubs").findOne(
          { $or: [{ id: scopeId }, { slug: scopeId }] },
          { projection: { name: 1, feeSchedule: 1, parentAssociationId: 1 } },
        );
        scopeName = club?.name;

        // Look up parent association schedule for fallback
        let assocSchedule: FeeScheduleEntry[] | null = null;
        if (club?.parentAssociationId) {
          const assoc = await db.collection("associations").findOne(
            { associationId: club.parentAssociationId },
            { projection: { feeSchedule: 1 } },
          );
          assocSchedule = assoc?.feeSchedule ?? null;
        }

        const entry = resolveFeeWithFallback(
          club?.feeSchedule ?? null,
          assocSchedule,
          requestedRole,
          effectiveSeasonYear,
        );
        if (entry) {
          resolvedFeeAmountCents = entry.amountCents;
          resolvedFeeDescription = buildFeeDescription(
            entry,
            roleDef.label,
            scopeName ?? scopeId,
          );
          resolvedGstIncluded    = entry.gstIncluded;
          resolvedGstAmountCents = calculateGST(
            entry.amountCents,
            entry.gstIncluded ?? true,
          ).gst;
        }
      } else if (scopeType === "association") {
        const assoc = await db.collection("associations").findOne(
          { associationId: scopeId },
          { projection: { name: 1, fullName: 1, feeSchedule: 1 } },
        );
        scopeName = assoc?.fullName ?? assoc?.name;

        const entry = resolveFeeWithFallback(
          assoc?.feeSchedule ?? null,
          null,
          requestedRole,
          effectiveSeasonYear,
        );
        if (entry) {
          resolvedFeeAmountCents = entry.amountCents;
          resolvedFeeDescription = buildFeeDescription(
            entry,
            roleDef.label,
            scopeName ?? scopeId,
          );
          resolvedGstIncluded    = entry.gstIncluded;
          resolvedGstAmountCents = calculateGST(
            entry.amountCents,
            entry.gstIncluded ?? true,
          ).gst;
        }
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
      ...(scopeId           ? { scopeId }                           : {}),
      ...(scopeName         ? { scopeName }                         : {}),
      ...(seasonYear        ? { seasonYear }                        : {}),
      ...(notes             ? { notes }                             : {}),
      requestedBy:          session.userId,
      requestedByName:      session.name,
      requestedAt:          now,
      requiresFee,
      // P1: store the fee amount resolved from the club/association schedule
      ...(resolvedFeeAmountCents !== undefined
        ? { feeAmountCents: resolvedFeeAmountCents }
        : {}),
      ...(resolvedFeeDescription
        ? { feeDescription: resolvedFeeDescription }
        : {}),
      // P6: GST metadata derived from the resolved fee schedule entry
      ...(resolvedGstIncluded !== undefined
        ? { gstIncluded: resolvedGstIncluded }
        : {}),
      ...(resolvedGstAmountCents !== undefined
        ? { gstAmountCents: resolvedGstAmountCents }
        : {}),
      feePaid:              false,
      status,
      createdAt:            now,
      updatedAt:            now,
    };

    await db.collection("role_requests").insertOne(roleRequest);

    logAdminTelemetry("admin.role_request.submit", {
      traceId,
      requestId:     roleRequest.requestId,
      memberId:      roleRequest.memberId,
      requestedRole: roleRequest.requestedRole,
      scopeType:     roleRequest.scopeType,
      scopeId:       roleRequest.scopeId ?? null,
      seasonYear:    roleRequest.seasonYear ?? null,
      status,
      requiresFee,
      submittedBy:   session.userId,
      submitterRole: session.role,
    });

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
    logAdminError("admin.role_request.submit.error", traceId, error);
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

    const client = await clientPromise;
    const db = client.db();

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
      const smid = session.memberId?.trim() || "";
      if (!smid) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      const ok = await isFamilyPrimaryForTarget(db, smid, memberId);
      if (!ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

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
