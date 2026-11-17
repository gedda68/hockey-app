/**
 * POST /api/role-requests/{requestId}/guardian   { action: "approve" | "refuse" }
 *
 * A parent/guardian of an under-18 decides on their role request. Approval lets an administrator approve it;
 * refusal closes the request.
 */

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";

export async function POST(request: NextRequest, { params }: { params: Promise<{ requestId: string }> }) {
  try {
    const session = await getSession();
    const me = session?.memberId?.trim();
    if (!session || !me) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

    const { requestId } = await params;
    const body = await request.json().catch(() => ({}));
    const action = body?.action;
    if (action !== "approve" && action !== "refuse") return NextResponse.json({ error: "Invalid action" }, { status: 400 });

    const db = (await clientPromise).db();
    const req = await db.collection("role_requests").findOne({ requestId });
    if (!req) return NextResponse.json({ error: "Request not found" }, { status: 404 });

    const ga = req.guardianApproval as { status: string; guardianIds: string[] } | undefined;
    if (!ga || ga.status !== "pending") return NextResponse.json({ error: "No guardian approval is needed" }, { status: 409 });
    if (!ga.guardianIds.includes(me)) return NextResponse.json({ error: "You aren't a parent/guardian for this person" }, { status: 403 });
    if (!["pending_payment", "awaiting_approval"].includes(req.status)) {
      return NextResponse.json({ error: `Request is already ${req.status}` }, { status: 409 });
    }

    const now = new Date().toISOString();
    const approved = action === "approve";
    await db.collection("role_requests").updateOne(
      { requestId, "guardianApproval.status": "pending" },
      {
        $set: {
          "guardianApproval.status": approved ? "approved" : "refused",
          "guardianApproval.decidedBy": me,
          "guardianApproval.decidedByName": session.name,
          "guardianApproval.decidedAt": now,
          updatedAt: now,
          ...(approved ? {} : { status: "rejected", reviewedAt: now, reviewedBy: me, reviewedByName: session.name, reviewerRole: "parent-guardian", reviewNotes: "A parent/guardian declined this request." }),
        },
      },
    );
    return NextResponse.json({ success: true, status: approved ? "guardian-approved" : "rejected" });
  } catch (e) {
    console.error("role-requests guardian:", e);
    return NextResponse.json({ error: "Failed to record the decision" }, { status: 500 });
  }
}
