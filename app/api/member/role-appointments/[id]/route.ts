/**
 * POST /api/member/role-appointments/{id}  { action: "accept" | "decline" | "withdraw" | "guardian-approve" | "guardian-refuse" }
 *  • accept / decline — only the invited member. Accepting creates the role holding on their record.
 *  • withdraw — only the person who sent it (or a super-admin), while it is still pending.
 */

import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";
import { resolveSessionMemberId } from "@/lib/auth/sessionMember";
import { getMatrixRole } from "@/lib/access/matrix";
import { effectiveAccess } from "@/lib/access/memberAccess";
import { holdingFromAppointment, hasHolding, canAppoint, type RoleAppointment } from "@/lib/access/appointments";
import { blueCardStatus } from "@/lib/members/blueCard";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const body = await request.json().catch(() => ({}));
    const action = String((body as any)?.action ?? "");
    if (!["accept", "decline", "withdraw", "guardian-approve", "guardian-refuse"].includes(action)) return NextResponse.json({ error: "Invalid action" }, { status: 400 });

    const db = await getDatabase();
    const appt = (await db.collection("role_appointments").findOne({ appointmentId: id }, { projection: { _id: 0 } })) as RoleAppointment | null;
    if (!appt) return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
    if (appt.status !== "pending") return NextResponse.json({ error: `This invitation was already ${appt.status}` }, { status: 409 });

    const me = await resolveSessionMemberId(db, session);
    const now = new Date().toISOString();

    if (action === "withdraw") {
      let allowed = session.role === "super-admin" || (!!me && appt.sentByMemberId === me);
      if (!allowed) {
        // Anyone with the authority to appoint this role in that organisation may withdraw it too.
        const role = getMatrixRole(appt.roleKey);
        const access = await effectiveAccess(db, session);
        allowed = !!role && access.context.kind === "org" && access.context.orgId === appt.orgId && canAppoint({ access }, role).ok;
      }
      if (!allowed) return NextResponse.json({ error: "You don't have permission to withdraw this invitation" }, { status: 403 });
      await db.collection("role_appointments").updateOne({ appointmentId: id }, { $set: { status: "withdrawn", respondedAt: now } });
      return NextResponse.json({ success: true, status: "withdrawn" });
    }

    if (action === "guardian-approve" || action === "guardian-refuse") {
      const ga = appt.guardianApproval;
      if (!ga || ga.status !== "pending") return NextResponse.json({ error: "No guardian approval is needed" }, { status: 409 });
      if (!me || !ga.guardianIds.includes(me)) return NextResponse.json({ error: "You aren't a parent/guardian for this person" }, { status: 403 });
      const approved = action === "guardian-approve";
      await db.collection("role_appointments").updateOne(
        { appointmentId: id },
        { $set: {
            "guardianApproval.status": approved ? "approved" : "refused",
            "guardianApproval.decidedBy": me,
            "guardianApproval.decidedByName": session.name,
            "guardianApproval.decidedAt": now,
            ...(approved ? {} : { status: "declined", respondedAt: now }),
          } },
      );
      return NextResponse.json({ success: true, status: approved ? "guardian-approved" : "declined" });
    }

    if (!me || appt.memberId !== me) return NextResponse.json({ error: "This invitation is not addressed to you" }, { status: 403 });

    // Under-18s can decline freely, but can only accept once a parent/guardian has approved.
    if (action === "accept" && appt.guardianApproval && appt.guardianApproval.status !== "approved") {
      return NextResponse.json({ error: "A parent/guardian needs to approve this first" }, { status: 409 });
    }

    if (action === "decline") {
      await db.collection("role_appointments").updateOne({ appointmentId: id }, { $set: { status: "declined", respondedAt: now } });
      return NextResponse.json({ success: true, status: "declined" });
    }

    const member = await db.collection("members").findOne({ memberId: me }, { projection: { roleHoldings: 1, blueCard: 1 } });
    if (!member) return NextResponse.json({ error: "Member record not found" }, { status: 404 });
    if (!hasHolding((member.roleHoldings as any[]) ?? [], appt.roleKey, appt.orgId)) {
      await db.collection("members").updateOne({ memberId: me }, { $push: { roleHoldings: holdingFromAppointment(appt) } as any, $set: { updatedAt: now } });
    }
    await db.collection("role_appointments").updateOne({ appointmentId: id }, { $set: { status: "accepted", respondedAt: now } });

    const role = getMatrixRole(appt.roleKey);
    const waitingOnBlueCard = !!role?.blueCardRequired && !blueCardStatus(member.blueCard as any).ok;
    return NextResponse.json({
      success: true,
      status: "accepted",
      // Roles that need a Blue Card stay inactive until a valid one is on the member's record.
      waitingOnBlueCard,
      note: waitingOnBlueCard ? "This role needs a valid Blue Card. It will switch on once yours is recorded as valid." : undefined,
    });
  } catch (e) {
    console.error("role-appointments respond error:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
