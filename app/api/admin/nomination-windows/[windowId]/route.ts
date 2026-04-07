/**
 * GET    /api/admin/nomination-windows/[windowId]  — fetch single window
 * PATCH  /api/admin/nomination-windows/[windowId]  — update window (dates, status transitions)
 * DELETE /api/admin/nomination-windows/[windowId]  — delete draft window only
 *
 * Status transitions:
 *   draft → open        (manual — admin publishes)
 *   open  → closed      (manual override or auto on closeDate passing)
 *   closed → balloting  (ballot workflow only — admin triggers ballot)
 *   balloting → completed
 *   closed → completed  (non-rep approval workflow — admin marks complete)
 *   closed → finalised  (rep-team approval — selector locks squad)
 *   finalised → ratified   (committee ratifies squad)
 *   ratified  → published  (squad announced; congratulations emails sent)
 */

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";
import { sendEmail } from "@/lib/email/client";
import { buildSquadSelectionEmail } from "@/lib/email/templates/squadSelection";
import type { NominationWindow, WindowStatus, Nomination } from "@/types/nominations";

const ALLOWED_ROLES = [
  "super-admin",
  "association-admin", "assoc-registrar", "assoc-selector",
  "club-admin", "registrar",
];

type Params = { params: Promise<{ windowId: string }> };

// ── GET ───────────────────────────────────────────────────────────────────────
export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session || !ALLOWED_ROLES.includes(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { windowId } = await params;
  const client = await clientPromise;
  const db = client.db("hockey-app");

  const win = await db.collection("nomination_windows").findOne({ windowId }) as NominationWindow | null;
  if (!win) return NextResponse.json({ error: "Window not found" }, { status: 404 });

  return NextResponse.json({ window: { ...win, _id: (win as any)._id?.toString() } });
}

// ── PATCH ─────────────────────────────────────────────────────────────────────
export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session || !ALLOWED_ROLES.includes(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { windowId } = await params;
  const body = await req.json() as Partial<NominationWindow> & { status?: WindowStatus };

  const client = await clientPromise;
  const db = client.db("hockey-app");

  const win = await db.collection("nomination_windows").findOne({ windowId }) as NominationWindow | null;
  if (!win) return NextResponse.json({ error: "Window not found" }, { status: 404 });

  // Status transition validation
  const VALID_TRANSITIONS: Record<WindowStatus, WindowStatus[]> = {
    draft:      ["open"],
    open:       ["closed"],
    closed:     ["balloting", "completed", "finalised"],
    balloting:  ["completed"],
    completed:  [],
    // Rep-team path
    finalised:  ["ratified"],
    ratified:   ["published"],
    published:  [],
  };

  if (body.status && body.status !== win.status) {
    const allowed = VALID_TRANSITIONS[win.status] ?? [];
    if (!allowed.includes(body.status)) {
      return NextResponse.json(
        { error: `Cannot transition from "${win.status}" to "${body.status}"` },
        { status: 409 }
      );
    }
    // Ballot transition only valid for ballot workflow
    if (body.status === "balloting" && win.workflow !== "ballot") {
      return NextResponse.json(
        { error: "Only ballot-workflow windows can enter balloting status" },
        { status: 409 }
      );
    }
  }

  const now = new Date().toISOString();
  const updatable: Partial<NominationWindow> = { updatedAt: now };

  // Allow updating editable fields (date changes before open, or while draft)
  const editableInDraft = ["title", "description", "openDate", "closeDate",
    "ageGroup", "gender", "positionTitle", "requiresStatement",
    "requiresFinancialMembership", "electorateType", "minBirthYear", "maxBirthYear"];

  if (win.status === "draft" || win.status === "open") {
    for (const field of editableInDraft) {
      if (body[field as keyof NominationWindow] !== undefined) {
        (updatable as any)[field] = body[field as keyof NominationWindow];
      }
    }
    // Allow closeDate update even when open (admin override)
    if (body.closeDate) updatable.closeDate = body.closeDate;
  }

  if (body.status) {
    updatable.status = body.status;
    // Capture timestamps for rep-team lifecycle transitions
    if (body.status === "finalised") {
      updatable.finalisedAt = now;
      updatable.finalisedBy = session.userId;
    } else if (body.status === "ratified") {
      updatable.ratifiedAt = now;
      updatable.ratifiedBy = session.userId;
    } else if (body.status === "published") {
      updatable.publishedAt = now;
      updatable.publishedBy = session.userId;
    }
  }

  await db.collection("nomination_windows").updateOne(
    { windowId },
    { $set: updatable }
  );

  // ── Send congratulations emails when squad is published ────────────────────
  if (body.status === "published" && win.category === "rep-team") {
    try {
      const selectedNoms = (await db.collection("rep_nominations")
        .find({ windowId, status: "accepted" })
        .toArray()) as unknown as Nomination[];

      for (const nom of selectedNoms) {
        const targetCollection = nom.nomineeType === "user" ? "users" : "members";
        const idField          = nom.nomineeType === "user" ? "userId" : "memberId";
        const person = await db.collection(targetCollection)
          .findOne({ [idField]: nom.nomineeId }) as { email?: string; firstName?: string } | null;

        if (!person?.email) continue;

        const emailContent = buildSquadSelectionEmail({
          firstName:  person.firstName ?? nom.nomineeName.split(" ")[0],
          email:      person.email,
          ageGroup:   win.ageGroup ?? "Representative",
          seasonYear: win.seasonYear,
          scopeName:  win.scopeName,
          isShadow:   nom.isShadow ?? false,
        });

        await sendEmail({ to: person.email, ...emailContent });
      }
    } catch (emailErr) {
      // Email errors must not fail the publish transition
      console.error("Squad publish email error:", emailErr);
    }
  }

  const updated = await db.collection("nomination_windows").findOne({ windowId });
  return NextResponse.json({ window: { ...updated, _id: (updated as any)?._id?.toString() } });
}

// ── DELETE ────────────────────────────────────────────────────────────────────
export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session || !ALLOWED_ROLES.includes(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { windowId } = await params;
  const client = await clientPromise;
  const db = client.db("hockey-app");

  const win = await db.collection("nomination_windows").findOne({ windowId }) as NominationWindow | null;
  if (!win) return NextResponse.json({ error: "Window not found" }, { status: 404 });

  if (win.status !== "draft") {
    return NextResponse.json(
      { error: "Only draft windows can be deleted. Close and complete active windows instead." },
      { status: 409 }
    );
  }

  // Also check no nominations reference this window
  const nomCount = await db.collection("rep_nominations").countDocuments({ windowId });
  if (nomCount > 0) {
    return NextResponse.json(
      { error: `Cannot delete — ${nomCount} nomination(s) exist for this window` },
      { status: 409 }
    );
  }

  await db.collection("nomination_windows").deleteOne({ windowId });
  return NextResponse.json({ success: true });
}
