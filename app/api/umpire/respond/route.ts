/**
 * GET /api/umpire/respond?token=...&action=accept|decline
 *
 * Token-based accept/decline for officials who are assigned via email link.
 * This is intentionally unauthenticated (possession of the token is the auth).
 *
 * It updates both:
 * - `umpire_assignments` (source of truth for token + audit)
 * - `league_fixtures.umpires[slotIndex]` (existing read paths)
 */

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { mergeUmpireSlotAllocationStatus } from "@/lib/member/umpireSelfService";

const ASSIGNMENTS_COL = "umpire_assignments";
const FIXTURES_COL = "league_fixtures";

function htmlPage(title: string, body: string) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="font-family: Arial, sans-serif; background:#f1f5f9; margin:0; padding:40px 16px;">
    <div style="max-width:680px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:28px 24px;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
      <h1 style="margin:0 0 10px;color:#0f172a;font-size:20px;">${escapeHtml(title)}</h1>
      <div style="color:#334155;font-size:14px;line-height:1.55;">${body}</div>
    </div>
  </body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token")?.trim() || "";
  const action = searchParams.get("action")?.trim() || "";

  if (!token || token.length !== 64) {
    return new NextResponse(
      htmlPage("Invalid link", "<p>This response link is invalid.</p>"),
      { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  }
  if (action !== "accept" && action !== "decline") {
    return new NextResponse(
      htmlPage("Invalid action", "<p>This response link is invalid.</p>"),
      { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  }

  const client = await clientPromise;
  const db = client.db();

  const assignment = (await db.collection(ASSIGNMENTS_COL).findOne({
    responseToken: token,
  })) as Record<string, unknown> | null;

  if (!assignment) {
    return new NextResponse(
      htmlPage(
        "Link not found",
        "<p>This response link may have already been used or replaced by a newer assignment.</p>",
      ),
      { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  }

  const tokenExpiresAt = String(assignment.tokenExpiresAt ?? "");
  if (!tokenExpiresAt) {
    return new NextResponse(
      htmlPage("Link expired", "<p>This response link has expired.</p>"),
      { status: 410, headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  }
  const expMs = Date.parse(tokenExpiresAt);
  if (!Number.isFinite(expMs) || expMs < Date.now()) {
    return new NextResponse(
      htmlPage("Link expired", "<p>This response link has expired.</p>"),
      { status: 410, headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  }

  const fixtureId = String(assignment.fixtureId ?? "");
  const seasonCompetitionId = String(assignment.seasonCompetitionId ?? "");
  const slotIndex = Number(assignment.slotIndex ?? -999);
  const umpireId = String(assignment.umpireId ?? "");

  if (!fixtureId || !seasonCompetitionId || !Number.isInteger(slotIndex) || slotIndex < 0 || !umpireId) {
    return new NextResponse(
      htmlPage(
        "Invalid assignment",
        "<p>This assignment record is incomplete. Please contact your officiating coordinator.</p>",
      ),
      { status: 500, headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  }

  const nowIso = new Date().toISOString();
  const newStatus = action === "accept" ? "accepted" : "declined";

  // Idempotency: if already in the requested state, just show success.
  const currentStatus = String(assignment.allocationStatus ?? "assigned");
  if (currentStatus === newStatus) {
    const msg = newStatus === "accepted" ? "You have already accepted this assignment." : "You have already declined this assignment.";
    return new NextResponse(
      htmlPage("Response recorded", `<p>${escapeHtml(msg)}</p>`),
      { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  }

  // Update assignment doc
  const set: Record<string, unknown> = {
    allocationStatus: newStatus,
    updatedAt: nowIso,
  };
  if (newStatus === "accepted") set.dateAccepted = nowIso;
  if (newStatus === "declined") set.dateDeclined = nowIso;

  await db.collection(ASSIGNMENTS_COL).updateOne(
    { responseToken: token },
    { $set: set },
  );

  // Update fixture slot (best-effort; keep assignment as source of truth)
  const fixture = (await db.collection(FIXTURES_COL).findOne({
    fixtureId,
    seasonCompetitionId,
  })) as Record<string, unknown> | null;

  if (fixture && Array.isArray((fixture as any).umpires)) {
    const umpires = [...((fixture as any).umpires as unknown[])];
    if (slotIndex < umpires.length) {
      const slot = umpires[slotIndex] as Record<string, unknown>;
      const uid = slot?.umpireId != null ? String(slot.umpireId) : "";
      if (uid === umpireId) {
        umpires[slotIndex] = mergeUmpireSlotAllocationStatus(slot, newStatus as any, nowIso);
        await db.collection(FIXTURES_COL).updateOne(
          { fixtureId, seasonCompetitionId },
          { $set: { umpires, updatedAt: nowIso, updatedBy: "umpire-token" } },
        );
      }
    }
  }

  const okMsg =
    newStatus === "accepted"
      ? "Thanks — you have accepted this assignment."
      : "Thanks — you have declined this assignment.";

  return new NextResponse(
    htmlPage("Response recorded", `<p>${escapeHtml(okMsg)}</p>`),
    { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

