/**
 * POST /api/admin/roles/expiry-reminder
 *
 * Bulk-sends seasonal re-registration reminder emails for a caller-supplied
 * list of role-expiry rows.  Used by the /admin/role-expiry dashboard's
 * "Send Reminder" action — both the per-row button and the bulk-select flow.
 *
 * ── Auth ──────────────────────────────────────────────────────────────────────
 *   Requires `registration.manage` permission (club-admin, registrar,
 *   assoc-admin, assoc-registrar, super-admin).
 *
 * ── Why rows are caller-supplied ─────────────────────────────────────────────
 *   The dashboard already has the expiry data in memory from its GET
 *   /api/admin/roles/expiring call.  Passing the rows avoids a redundant DB
 *   round-trip and lets the UI send only the rows the admin has selected.
 *
 * ── Email template ────────────────────────────────────────────────────────────
 *   Re-uses `buildSeasonalRegistrationReminderEmail` from R6.
 *   `weeksLabel` is derived from `daysUntilExpiry`:
 *     ≤ 20 days → "2w" (urgent, red urgency banner)
 *     > 20 days → "6w" (planning, amber urgency banner)
 *   `currentSeasonYear` comes from the row's `seasonYear` field.
 *   `upcomingSeasonYear` is currentSeasonYear + 1.
 *
 * ── Deduplication ────────────────────────────────────────────────────────────
 *   Unlike the scheduled cron job (R6), this admin-initiated send does NOT
 *   check the reminder_log.  The admin has explicitly selected these members
 *   and may legitimately want to resend (e.g. a prior email bounced).
 *   Each successful send is still logged for audit purposes.
 *
 * ── Body ──────────────────────────────────────────────────────────────────────
 *   {
 *     rows: Array<{
 *       memberId:       string;
 *       memberName:     string;
 *       email?:         string;
 *       roleLabel:      string;
 *       scopeName?:     string;
 *       scopeType?:     "club" | "association" | "team";
 *       seasonYear?:    string;
 *       daysUntilExpiry: number;
 *     }>
 *   }
 *
 * ── Response ──────────────────────────────────────────────────────────────────
 *   200 { sent: number; skipped: number; failed: number;
 *         results: Array<{ memberId, memberName, status: "sent"|"skipped"|"failed", reason? }> }
 *   400 missing / empty rows
 *   401 / 403 auth
 */

import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/middleware";
import { sendEmail } from "@/lib/email/client";
import { buildSeasonalRegistrationReminderEmail } from "@/lib/email/templates/seasonalRegistrationReminder";
import { getDatabase } from "@/lib/mongodb";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ReminderRow {
  memberId:        string;
  memberName:      string;
  email?:          string;
  roleLabel:       string;
  scopeName?:      string;
  scopeType?:      "club" | "association" | "team";
  seasonYear?:     string;
  daysUntilExpiry: number;
}

// ── Helper ────────────────────────────────────────────────────────────────────

/** Map days-until-expiry to email urgency wave. */
function weeksLabelFor(days: number): "6w" | "2w" {
  return days <= 20 ? "2w" : "6w";
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const { response } = await requirePermission(request, "registration.manage");
  if (response) return response;

  let body: { rows?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!Array.isArray(body.rows) || body.rows.length === 0) {
    return NextResponse.json(
      { error: "rows array is required and must be non-empty" },
      { status: 400 },
    );
  }

  const rows = body.rows as ReminderRow[];

  // Cap to 200 per request to prevent accidental mass-sends
  if (rows.length > 200) {
    return NextResponse.json(
      { error: "Maximum 200 rows per request — split into smaller batches" },
      { status: 400 },
    );
  }

  const db = await getDatabase();
  const now = new Date();

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  const results: Array<{
    memberId:   string;
    memberName: string;
    status:     "sent" | "skipped" | "failed";
    reason?:    string;
  }> = [];

  for (const row of rows) {
    const memberId   = String(row.memberId ?? "").trim();
    const memberName = String(row.memberName ?? "Member").trim();

    // Need a valid email
    const email = String(row.email ?? "").trim();
    if (!email || !email.includes("@")) {
      results.push({ memberId, memberName, status: "skipped", reason: "no email address" });
      skipped++;
      continue;
    }

    // Derive season years
    const currentSeasonYear  = row.seasonYear ?? String(now.getFullYear());
    const upcomingSeasonYear = String(parseInt(currentSeasonYear, 10) + 1);

    // Derive first name from memberName (best-effort)
    const firstName = memberName.split(/\s+/)[0] ?? "Member";

    const weeksLabel = weeksLabelFor(row.daysUntilExpiry);
    const scopeType  = row.scopeType ?? "club";

    const emailContent = buildSeasonalRegistrationReminderEmail({
      firstName,
      roleLabel:          row.roleLabel,
      scopeName:          row.scopeName ?? "your club",
      scopeType,
      currentSeasonYear,
      upcomingSeasonYear,
      weeksLabel,
      customText:         null,
    });

    const result = await sendEmail({
      to:      email,
      subject: emailContent.subject,
      html:    emailContent.html,
      text:    emailContent.text,
    });

    if (result.success) {
      // Audit log (non-fatal — don't fail the send if logging fails)
      try {
        await db.collection("reminder_log").insertOne({
          type:               "role_expiry_admin_reminder",
          memberId,
          role:               row.roleLabel,
          upcomingSeasonYear,
          reminderLabel:      weeksLabel,
          triggeredManually:  true,
          sentAt:             now,
        });
      } catch (logErr) {
        console.warn("[expiry-reminder] audit log failed:", logErr);
      }

      results.push({ memberId, memberName, status: "sent" });
      sent++;
    } else {
      console.error(
        `[expiry-reminder] send failed for ${email} (memberId="${memberId}"): ${result.error}`,
      );
      results.push({ memberId, memberName, status: "failed", reason: result.error });
      failed++;
    }
  }

  return NextResponse.json({ sent, skipped, failed, results });
}
