/**
 * POST /api/admin/nominations/windows/[windowId]/close
 *
 * Closes an open nomination window — transitioning status from "open" to
 * "closed" so that a ballot (for ballot-workflow windows) or manual selection
 * (for approval-workflow windows) can proceed.
 *
 * ── Validation ────────────────────────────────────────────────────────────────
 *   • Window must exist and be in "open" status.
 *   • Caller must have selection.manage permission AND resource access to the
 *     window's scope (club or association).
 *
 * ── What it does ──────────────────────────────────────────────────────────────
 *   • Sets status → "closed"
 *   • Records closedAt (ISO) and closedBy (session userId)
 *   • Returns the updated window document
 *
 * ── What it does NOT do ───────────────────────────────────────────────────────
 *   • It does not create a ballot — that is a separate POST /api/admin/ballots
 *     call so the admin can confirm candidate list and voting deadline first.
 *   • It does not reject nominations — pending nominations remain pending;
 *     they will be included in the ballot or decided individually.
 *
 * Required permission: selection.manage
 * Scope: caller must have access to the window's scopeType + scopeId.
 */

import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { requirePermission, requireResourceAccess } from "@/lib/auth/middleware";
import { getSession } from "@/lib/auth/session";
import type { NominationWindow } from "@/types/nominations";

type Params = { params: Promise<{ windowId: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  // ── Auth ───────────────────────────────────────────────────────────────────
  const { response: authRes } = await requirePermission(request, "selection.manage");
  if (authRes) return authRes;

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { windowId } = await params;
  const db = await getDatabase();

  // ── Load window ────────────────────────────────────────────────────────────
  const win = (await db
    .collection("nomination_windows")
    .findOne({ windowId })) as NominationWindow | null;

  if (!win) {
    return NextResponse.json({ error: "Nomination window not found" }, { status: 404 });
  }

  // ── Scope check ────────────────────────────────────────────────────────────
  const { response: scopeRes } = await requireResourceAccess(
    request,
    win.scopeType,
    win.scopeId,
  );
  if (scopeRes) return scopeRes;

  // ── State guard ────────────────────────────────────────────────────────────
  if (win.status !== "open") {
    return NextResponse.json(
      {
        error: `Window cannot be closed in its current state: "${win.status}". Only "open" windows can be closed.`,
      },
      { status: 409 },
    );
  }

  // ── Close the window ───────────────────────────────────────────────────────
  const now = new Date().toISOString();

  await db.collection("nomination_windows").updateOne(
    { windowId },
    {
      $set: {
        status:    "closed",
        closedAt:  now,
        closedBy:  session.userId,
        updatedAt: now,
      },
    },
  );

  // Count how many nominations are still pending (useful for the caller to
  // decide whether to proceed to ballot or handle individually)
  const pendingCount = await db
    .collection("rep_nominations")
    .countDocuments({ windowId, status: "pending" });

  const acceptedCount = await db
    .collection("rep_nominations")
    .countDocuments({ windowId, status: "accepted" });

  return NextResponse.json({
    ok:             true,
    windowId,
    previousStatus: "open",
    status:         "closed",
    closedAt:       now,
    closedBy:       session.userId,
    workflow:       win.workflow,
    pendingCount,
    acceptedCount,
    // Hint: for ballot workflow, the admin can now POST /api/admin/ballots
    // with this windowId if pendingCount >= 2.
    nextStep:
      win.workflow === "ballot"
        ? pendingCount >= 2
          ? `Ready to ballot — POST /api/admin/ballots { windowId: "${windowId}" }`
          : `Only ${pendingCount} pending nomination(s) — at least 2 candidates required for a ballot`
        : "Approval workflow — review nominations individually",
  });
}
