/**
 * PATCH  /api/admin/nominations/[id]
 *   action: "accept"              → approve nomination, auto-create role_request if position nom
 *   action: "reject"              → reject with required notes
 *   action: "withdraw"            → nominator / nominee withdraws
 *   action: "accept-third-party"  → nominee accepts a nomination made on their behalf
 *   action: "decline-third-party" → nominee declines, moves to withdrawn
 *   action: "finalise-rep-team"   → selector marks the whole age group/window as finalised
 *
 * DELETE /api/admin/nominations/[id]  — remove (draft / pending only)
 */

import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";
import type { Nomination, DecideNominationRequest, NominationWindow } from "@/types/nominations";
import type { RoleAssignment, ScopeType } from "@/lib/types/roles";
import { ROLE_DEFINITIONS } from "@/lib/types/roles";

type Params = { params: Promise<{ id: string }> };

function nominationFilter(id: string) {
  return ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { nominationId: id };
}

// ── PATCH ─────────────────────────────────────────────────────────────────────
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

    const { id } = await params;
    const body = await request.json() as DecideNominationRequest & {
      notes?: string;
      nominatedBy?: string;
      status?: string;
      isShadow?: boolean;
      squadOrder?: number;
      withdrawalInfo?: { reason: string; note?: string; withdrawnAt: string };
    };
    const { action } = body;

    const client = await clientPromise;
    const db = client.db("hockey-app");

    const nom = await db.collection("rep_nominations").findOne(nominationFilter(id)) as Nomination | null;
    if (!nom) return NextResponse.json({ error: "Nomination not found" }, { status: 404 });

    const now = new Date().toISOString();
    const update: Record<string, unknown> = { updatedAt: now };

    // ── Field-patch path: no action, no status — update squad fields directly ──
    if (!action && body.status === undefined) {
      if (body.isShadow !== undefined) update.isShadow = body.isShadow;
      if (body.squadOrder !== undefined) update.squadOrder = body.squadOrder;
      if (body.withdrawalInfo !== undefined) update.withdrawalInfo = body.withdrawalInfo;
      if (body.notes !== undefined) update.notes = body.notes;
      if (Object.keys(update).length === 1) {
        // Only updatedAt — nothing to do
        return NextResponse.json({ error: "No fields to update" }, { status: 400 });
      }
      await db.collection("rep_nominations").updateOne(nominationFilter(id), { $set: update });
      const result = await db.collection("rep_nominations").findOne(nominationFilter(id));
      return NextResponse.json({ ...result, _id: (result as any)?._id?.toString() });
    }

    // ── Legacy path: direct status update (no action key) ──────────────────────
    if (!action && body.status) {
      update.status = body.status;
      if (body.notes !== undefined) update.notes = body.notes;
      if (body.nominatedBy !== undefined) update.nominatedBy = body.nominatedBy;
      await db.collection("rep_nominations").updateOne(nominationFilter(id), { $set: update });
      const result = await db.collection("rep_nominations").findOne(nominationFilter(id));
      return NextResponse.json({ ...result, _id: (result as any)?._id?.toString() });
    }

    if (!action) {
      return NextResponse.json({ error: "action is required" }, { status: 400 });
    }

    // ── Accept ─────────────────────────────────────────────────────────────────
    if (action === "accept") {
      const APPROVER_ROLES = [
        "super-admin", "association-admin", "assoc-registrar", "assoc-selector",
        "club-admin", "registrar",
      ];
      if (!APPROVER_ROLES.includes(session.role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      update.status          = "accepted";
      update.reviewedBy      = session.userId;
      update.reviewedByName  = session.name;
      update.reviewerRole    = session.role;
      update.reviewedAt      = now;
      if (body.reviewNotes) update.reviewNotes = body.reviewNotes;

      // Auto-assign role for position nominations
      const win = nom.windowId
        ? await db.collection("nomination_windows").findOne({ windowId: nom.windowId }) as NominationWindow | null
        : null;

      if (win?.positionRole && nom.nomineeId) {
        const roleDef = ROLE_DEFINITIONS[win.positionRole as keyof typeof ROLE_DEFINITIONS];
        const targetCollection = nom.nomineeType === "user" ? "users" : "members";
        const idField          = nom.nomineeType === "user" ? "userId" : "memberId";

        const assignment: RoleAssignment = {
          role:         win.positionRole as any,
          scopeType:    win.scopeType as ScopeType,
          scopeId:      win.scopeId,
          scopeName:    win.scopeName,
          grantedAt:    now,
          grantedBy:    session.userId,
          seasonYear:   win.seasonYear,
          notes:        `Auto-assigned via nomination ${nom.nominationId}`,
          active:       true,
          ...(win.seasonYear && roleDef?.seasonalRegistration
            ? { expiresAt: `${win.seasonYear}-12-31T23:59:59.000Z` }
            : {}),
        };

        await db.collection(targetCollection).updateOne(
          { [idField]: nom.nomineeId },
          { $push: { roles: assignment as any } }
        );

        update.roleAssignedAt = now;
      }
    }

    // ── Reject ─────────────────────────────────────────────────────────────────
    else if (action === "reject") {
      const APPROVER_ROLES = [
        "super-admin", "association-admin", "assoc-registrar", "assoc-selector",
        "club-admin", "registrar",
      ];
      if (!APPROVER_ROLES.includes(session.role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (!body.reviewNotes?.trim()) {
        return NextResponse.json({ error: "reviewNotes is required when rejecting" }, { status: 400 });
      }

      update.status          = "rejected";
      update.reviewedBy      = session.userId;
      update.reviewedByName  = session.name;
      update.reviewerRole    = session.role;
      update.reviewedAt      = now;
      update.reviewNotes     = body.reviewNotes.trim();
    }

    // ── Withdraw ───────────────────────────────────────────────────────────────
    else if (action === "withdraw") {
      const isSelf = session.userId === nom.nomineeId || session.memberId === nom.nomineeId;
      const isAdmin = ["super-admin", "association-admin", "club-admin", "registrar"].includes(session.role);
      if (!isSelf && !isAdmin) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      update.status = "withdrawn";
      if (body.withdrawalInfo) update.withdrawalInfo = body.withdrawalInfo;
    }

    // ── Third-party acceptance ─────────────────────────────────────────────────
    else if (action === "accept-third-party") {
      const isSelf = session.userId === nom.nomineeId || session.memberId === nom.nomineeId;
      if (!isSelf) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      if (nom.status !== "pending-acceptance") {
        return NextResponse.json({ error: "Nomination is not awaiting your acceptance" }, { status: 409 });
      }
      update.status           = "pending";  // now in admin review queue
      update.nomineeAccepted  = true;
      update.nomineeAcceptedAt = now;
    }

    // ── Third-party decline ────────────────────────────────────────────────────
    else if (action === "decline-third-party") {
      const isSelf = session.userId === nom.nomineeId || session.memberId === nom.nomineeId;
      if (!isSelf) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      update.status           = "withdrawn";
      update.nomineeAccepted  = false;
      update.nomineeAcceptedAt = now;
    }

    else {
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    await db.collection("rep_nominations").updateOne(nominationFilter(id), { $set: update });
    const result = await db.collection("rep_nominations").findOne(nominationFilter(id));
    return NextResponse.json({ ...result, _id: (result as any)?._id?.toString() });

  } catch (error: unknown) {
    console.error("PATCH /api/admin/nominations/[id] error:", error);
    return NextResponse.json({ error: "Failed to update nomination" }, { status: 500 });
  }
}

// ── DELETE ────────────────────────────────────────────────────────────────────
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

    const ADMIN_ROLES = ["super-admin", "association-admin", "assoc-registrar", "club-admin", "registrar"];
    if (!ADMIN_ROLES.includes(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const client = await clientPromise;
    const db = client.db("hockey-app");

    const nom = await db.collection("rep_nominations").findOne(nominationFilter(id)) as Nomination | null;
    if (!nom) return NextResponse.json({ error: "Nomination not found" }, { status: 404 });

    if (!["pending", "pending-acceptance", "withdrawn"].includes(nom.status)) {
      return NextResponse.json(
        { error: `Cannot delete a nomination with status "${nom.status}"` },
        { status: 409 }
      );
    }

    await db.collection("rep_nominations").deleteOne(nominationFilter(id));
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("DELETE /api/admin/nominations/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete nomination" }, { status: 500 });
  }
}
