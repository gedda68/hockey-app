/**
 * GET /api/cron/membership-renewal-reminder
 *
 * Monthly cron job — finds members whose membership expires within 30 days
 * and sends a renewal reminder email + creates a persistent in-app notification
 * that surfaces as a banner on every admin portal login until dismissed.
 *
 * ── Deduplication ─────────────────────────────────────────────────────────────
 *   Each member document tracks `renewalReminderSentAt` (ISO string).
 *   The job skips any member where that field was set within the last 25 days,
 *   making it safe to run once or twice a month without double-sending.
 *
 * ── In-app notification ───────────────────────────────────────────────────────
 *   For every email sent, an upsert is performed on the `member_notifications`
 *   collection (keyed on memberId + type + seasonYear).  A dismissed or
 *   already-seen notification is NOT overwritten — a new one is only inserted
 *   when none exists for the current season window.
 *
 * ── Auth ──────────────────────────────────────────────────────────────────────
 *   Bearer token OR ?secret= query param matched against CRON_SECRET env var.
 *   Returns 401 if wrong; 503 if CRON_SECRET is not configured.
 *
 * ── Params ────────────────────────────────────────────────────────────────────
 *   ?secret=<CRON_SECRET>   Required auth token
 *   ?dryRun=true            Log would-be sends; skip Resend calls and DB writes
 *   ?force=true             Ignore the 25-day dedup window (re-send to all eligible)
 *   ?clubId=<id>            Limit to one club (for debugging / manual triggers)
 *   ?windowDays=<n>         Override the 30-day expiry look-ahead (default: 30)
 *
 * ── Recommended schedule ──────────────────────────────────────────────────────
 *   0 8 1 * *   GET /api/cron/membership-renewal-reminder   (1st of each month)
 *   0 8 15 * *  GET /api/cron/membership-renewal-reminder   (15th safety run)
 *
 * ── Response ──────────────────────────────────────────────────────────────────
 *   200 {
 *     ok: true,
 *     dryRun: boolean,
 *     windowDays: number,
 *     scanned: number,
 *     sent: number,
 *     skipped: number,
 *     failed: number,
 *     results: Array<{
 *       memberId: string;
 *       email: string;
 *       clubId: string;
 *       expiresAt: string;
 *       outcome: "sent" | "skipped" | "failed" | "dry_run";
 *       reason?: string;
 *     }>;
 *   }
 */

import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { getDatabase } from "@/lib/mongodb";
import { sendEmail } from "@/lib/email/client";
import { buildMemberRenewalReminderEmail } from "@/lib/email/templates/memberRenewalReminder";

// ── Auth ──────────────────────────────────────────────────────────────────────

function authorizeCron(request: NextRequest): boolean {
  const secret = String(process.env.CRON_SECRET ?? "").trim();
  if (!secret) return false;
  const auth   = request.headers.get("authorization") ?? "";
  const bearer = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  const qp     = request.nextUrl.searchParams.get("secret") ?? "";
  return bearer === secret || qp === secret;
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface CronResult {
  memberId:  string;
  email:     string;
  clubId:    string;
  expiresAt: string;
  outcome:   "sent" | "skipped" | "failed" | "dry_run";
  reason?:   string;
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  // ── Auth ───────────────────────────────────────────────────────────────────
  const cronSecret = String(process.env.CRON_SECRET ?? "").trim();
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 503 });
  }
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Parse params ───────────────────────────────────────────────────────────
  const sp         = request.nextUrl.searchParams;
  const dryRun     = sp.get("dryRun") === "true";
  const force      = sp.get("force")  === "true";
  const onlyClubId = sp.get("clubId")?.trim() || null;
  const windowDays = Math.max(1, parseInt(sp.get("windowDays") ?? "30", 10) || 30);

  // Members whose renewalReminderSentAt is within this many days ago are skipped
  const dedupDays  = 25;

  const now        = new Date();
  const windowEnd  = new Date(now.getTime() + windowDays * 86_400_000);
  const dedupCutoff = new Date(now.getTime() - dedupDays * 86_400_000);

  const db = await getDatabase();

  // ── Build member query ─────────────────────────────────────────────────────
  const memberFilter: Record<string, unknown> = {
    "membership.status": "Active",
    "membership.currentPeriodEnd": {
      $gte: now.toISOString(),
      $lte: windowEnd.toISOString(),
    },
  };

  if (onlyClubId) {
    memberFilter["membership.clubId"] = onlyClubId;
  }

  if (!force) {
    // Skip members who already received a reminder recently
    memberFilter["$or"] = [
      { renewalReminderSentAt: { $exists: false } },
      { renewalReminderSentAt: null },
      { renewalReminderSentAt: { $lt: dedupCutoff.toISOString() } },
    ];
  }

  const members = await db
    .collection("members")
    .find(memberFilter, {
      projection: {
        memberId: 1,
        "personalInfo.firstName": 1,
        "membership.clubId": 1,
        "membership.currentPeriodEnd": 1,
        "contact.email": 1,
        renewalReminderSentAt: 1,
      },
    })
    .toArray();

  if (members.length === 0) {
    return NextResponse.json({
      ok: true, dryRun, windowDays,
      scanned: 0, sent: 0, skipped: 0, failed: 0,
      results: [],
    });
  }

  // ── Load clubs in bulk ─────────────────────────────────────────────────────
  const clubIds = [...new Set(members.map((m) => String(m.membership?.clubId ?? "")))].filter(Boolean);
  const clubDocs = await db
    .collection("clubs")
    .find({ id: { $in: clubIds } }, { projection: { id: 1, name: 1 } })
    .toArray();

  const clubMap = new Map<string, string>(
    clubDocs.map((c) => [String(c.id), String(c.name ?? c.id)]),
  );

  // ── Process each member ────────────────────────────────────────────────────
  let sent = 0, skipped = 0, failed = 0;
  const results: CronResult[] = [];

  // Infer the season year from the expiry date (use the year it expires in)
  function seasonYearFromExpiry(expiresAt: string): string {
    return new Date(expiresAt).getFullYear().toString();
  }

  for (const member of members) {
    const memberId  = String(member.memberId ?? "");
    const clubId    = String(member.membership?.clubId ?? "");
    const expiresAt = String(member.membership?.currentPeriodEnd ?? "");
    const email     = String(member.contact?.email ?? "").trim().toLowerCase();
    const firstName = String(member.personalInfo?.firstName ?? "Member").trim();
    const clubName  = clubMap.get(clubId) ?? clubId;
    const seasonYear = seasonYearFromExpiry(expiresAt);

    if (!email) {
      skipped++;
      results.push({ memberId, email: "", clubId, expiresAt, outcome: "skipped", reason: "no email address" });
      console.warn(`[renewal-reminder] no email for memberId="${memberId}" — skipping`);
      continue;
    }

    if (dryRun) {
      sent++;
      results.push({ memberId, email, clubId, expiresAt, outcome: "dry_run" });
      console.info(
        `[renewal-reminder][dryRun] Would send to ${email} (memberId="${memberId}", expires="${expiresAt}")`,
      );
      continue;
    }

    // ── Send email ───────────────────────────────────────────────────────────
    const emailPayload = buildMemberRenewalReminderEmail({
      firstName,
      memberId,
      clubName,
      clubId,
      expiresAt,
      seasonYear,
    });

    const sendResult = await sendEmail({
      to:      email,
      subject: emailPayload.subject,
      html:    emailPayload.html,
      text:    emailPayload.text,
    });

    if (!sendResult.success) {
      failed++;
      results.push({ memberId, email, clubId, expiresAt, outcome: "failed", reason: sendResult.error });
      console.error(`[renewal-reminder] email failed for ${email}: ${sendResult.error}`);
      continue;
    }

    // ── Mark member as reminded ──────────────────────────────────────────────
    await db.collection("members").updateOne(
      { memberId },
      { $set: { renewalReminderSentAt: now.toISOString() } },
    );

    // ── Upsert in-app notification ───────────────────────────────────────────
    // Only create if no undismissed notification already exists for this
    // member + type + seasonYear combination.
    const existingNotif = await db.collection("member_notifications").findOne({
      memberId,
      type: "renewal_reminder",
      seasonYear,
      dismissedAt: null,
    });

    if (!existingNotif) {
      // Expires 7 days after the membership expiry (keep the banner visible briefly after expiry)
      const notifExpiresAt = new Date(new Date(expiresAt).getTime() + 7 * 86_400_000).toISOString();

      await db.collection("member_notifications").insertOne({
        notificationId: `notif-${uuidv4()}`,
        memberId,
        type:        "renewal_reminder",
        seasonYear,
        title:       "Membership expiring soon",
        message:     `Your membership with ${clubName} expires on ${new Date(expiresAt).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })}.`,
        link:        `/admin/my-registrations?role=member&clubId=${encodeURIComponent(clubId)}`,
        clubId,
        clubName,
        createdAt:   now.toISOString(),
        dismissedAt: null,
        expiresAt:   notifExpiresAt,
      });
    }

    sent++;
    results.push({ memberId, email, clubId, expiresAt, outcome: "sent" });
  }

  return NextResponse.json({
    ok:         true,
    dryRun,
    windowDays,
    scanned:    members.length,
    sent,
    skipped,
    failed,
    results,
  });
}
