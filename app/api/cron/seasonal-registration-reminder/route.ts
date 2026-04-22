/**
 * GET /api/cron/seasonal-registration-reminder
 *
 * Seasonal re-registration reminder cron job (R6).
 *
 * ── What it does ──────────────────────────────────────────────────────────────
 *   Finds members who held an approved seasonal role (player, member, coach,
 *   etc.) in the most-recent completed/current season and have NOT yet
 *   submitted a role-request for the upcoming season.  Sends a reminder email
 *   via Resend and logs each send to the `reminder_log` collection so the job
 *   is safe to run repeatedly without double-sending.
 *
 * ── Trigger ───────────────────────────────────────────────────────────────────
 *   Called by an external scheduler (Vercel Cron, cron-job.org, GitHub Actions,
 *   etc.) with:
 *     ?secret=CRON_SECRET          Auth — matches CRON_SECRET env var
 *     ?weeks=6|2                   Which reminder wave to process:
 *                                    6 → 35–49 days before season start
 *                                    2 →  7–20 days before season start
 *
 *   Optional / test params:
 *     ?dryRun=true                 Log what would be sent; skip Resend calls
 *     ?associationId=<id>          Only process one association (debugging)
 *     ?force=true                  Skip the reminder-window check (sends to
 *                                  ALL eligible members regardless of date).
 *                                  Use with ?dryRun=true for QA previews.
 *
 * ── Recommended cron schedule ─────────────────────────────────────────────────
 *   # 6-week reminder: run every Monday — the window check ensures it only
 *   # fires when an association's season start is 35–49 days away.
 *   0 9 * * 1  GET /api/cron/seasonal-registration-reminder?weeks=6
 *
 *   # 2-week reminder: run every Monday
 *   0 9 * * 1  GET /api/cron/seasonal-registration-reminder?weeks=2
 *
 * ── Deduplication ─────────────────────────────────────────────────────────────
 *   Before sending, the job checks the `reminder_log` collection for a
 *   document matching { type, memberId, requestedRole, scopeId,
 *   upcomingSeasonYear, reminderLabel }.  If one exists the member is skipped.
 *   On successful send a log document is inserted.
 *
 * ── Communications hub opt-in ─────────────────────────────────────────────────
 *   Each association controls seasonal reminders via
 *   `communication_hub_settings.seasonalReminderEnabled` (default false).
 *   Associations that have not opted in are skipped entirely.
 *   Per-association custom text is injected into the email body.
 *
 * ── Auth ──────────────────────────────────────────────────────────────────────
 *   Bearer token OR ?secret= query param, matched against CRON_SECRET env var.
 *   Returns 401 if secret is wrong; 503 if CRON_SECRET is not configured.
 *
 * ── Response ──────────────────────────────────────────────────────────────────
 *   200 {
 *     ok: true,
 *     dryRun: boolean,
 *     weeksParam: number,
 *     currentSeasonYear: string,
 *     upcomingSeasonYear: string,
 *     associations: Array<{
 *       associationId: string; name: string;
 *       seasonStartMonth: number; daysUntilSeasonStart: number;
 *       inWindow: boolean; enabled: boolean;
 *       scanned: number; sent: number; skipped: number; failed: number;
 *     }>;
 *     totals: { scanned: number; sent: number; skipped: number; failed: number };
 *   }
 */

import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { ROLE_DEFINITIONS } from "@/lib/types/roles";
import type { UserRole } from "@/lib/types/roles";
import {
  mergeCommunicationHubSettings,
} from "@/lib/communications/communicationHubSettings";
import { sendEmail } from "@/lib/email/client";
import { buildSeasonalRegistrationReminderEmail } from "@/lib/email/templates/seasonalRegistrationReminder";
import {
  daysUntilSeasonStart,
  reminderLabelForDays,
  upcomingSeasonYearFor,
  currentSeasonYearFor,
} from "@/lib/cron/seasonHelpers";

// ── Auth helper ───────────────────────────────────────────────────────────────

function authorizeCron(request: NextRequest): boolean {
  const secret = String(process.env.CRON_SECRET ?? "").trim();
  if (!secret) return false;
  const auth   = request.headers.get("authorization") ?? "";
  const bearer = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  const qp     = request.nextUrl.searchParams.get("secret") ?? "";
  return bearer === secret || qp === secret;
}

// ── Seasonal roles ─────────────────────────────────────────────────────────────

/** All roles that require annual re-registration. */
const SEASONAL_ROLES: UserRole[] = (
  Object.entries(ROLE_DEFINITIONS) as [UserRole, (typeof ROLE_DEFINITIONS)[UserRole]][]
)
  .filter(([, def]) => def.seasonalRegistration)
  .map(([role]) => role);

// Season date helpers are imported from lib/cron/seasonHelpers.ts (testable there).

// ── Main handler ──────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  // ── Auth ────────────────────────────────────────────────────────────────────
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!String(process.env.CRON_SECRET ?? "").trim()) {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 503 });
  }

  // ── Parse params ────────────────────────────────────────────────────────────
  const sp             = request.nextUrl.searchParams;
  const weeksParam     = parseInt(sp.get("weeks") ?? "0", 10);
  const dryRun         = sp.get("dryRun") === "true";
  const forceWindow    = sp.get("force") === "true";
  const onlyAssocId    = sp.get("associationId")?.trim() || null;

  if (weeksParam !== 6 && weeksParam !== 2) {
    return NextResponse.json(
      { error: "?weeks=6 or ?weeks=2 is required" },
      { status: 400 },
    );
  }

  const db = await getDatabase();

  // ── Load associations ────────────────────────────────────────────────────────
  const assocQuery: Record<string, unknown> = onlyAssocId
    ? { associationId: onlyAssocId }
    : {};

  const associations = await db
    .collection("associations")
    .find(assocQuery, {
      projection: {
        associationId: 1, name: 1,
        seasonStartMonth: 1,
      },
    })
    .toArray();

  if (associations.length === 0) {
    return NextResponse.json({
      ok: true, dryRun, weeksParam,
      associations: [], totals: { scanned: 0, sent: 0, skipped: 0, failed: 0 },
    });
  }

  // ── Load all hub settings in one query ────────────────────────────────────
  const hubRows = await db
    .collection("communication_hub_settings")
    .find({ scopeType: "association" })
    .toArray();

  const hubMap = new Map(
    hubRows.map((r) => [
      String(r.scopeId ?? ""),
      mergeCommunicationHubSettings(r as Record<string, unknown>),
    ]),
  );

  // ── Load clubs → association mapping ─────────────────────────────────────
  const clubDocs = await db
    .collection("clubs")
    .find({}, { projection: { id: 1, parentAssociationId: 1, name: 1 } })
    .toArray();

  const clubToAssoc = new Map<string, string>(
    clubDocs
      .filter((c) => c.id && c.parentAssociationId)
      .map((c) => [String(c.id), String(c.parentAssociationId)]),
  );
  const clubNameMap = new Map<string, string>(
    clubDocs
      .filter((c) => c.id)
      .map((c) => [String(c.id), String(c.name ?? c.id)]),
  );

  // Build set of all club IDs per association for efficient querying
  const assocClubIds = new Map<string, string[]>();
  for (const [clubId, assocId] of clubToAssoc) {
    const list = assocClubIds.get(assocId) ?? [];
    list.push(clubId);
    assocClubIds.set(assocId, list);
  }

  // ── Totals accumulator ────────────────────────────────────────────────────
  const totals = { scanned: 0, sent: 0, skipped: 0, failed: 0 };

  // ── Per-association results ───────────────────────────────────────────────
  const assocResults: Array<{
    associationId: string; name: string;
    seasonStartMonth: number; daysUntilSeasonStart: number;
    inWindow: boolean; enabled: boolean;
    scanned: number; sent: number; skipped: number; failed: number;
  }> = [];

  for (const assoc of associations) {
    const assocId          = String(assoc.associationId ?? "");
    const assocName        = String(assoc.name ?? assocId);
    const seasonStartMonth = typeof assoc.seasonStartMonth === "number"
      ? assoc.seasonStartMonth
      : 1; // default January

    const daysUntil     = daysUntilSeasonStart(seasonStartMonth);
    const winLabel      = reminderLabelForDays(daysUntil);
    const inWindow      = forceWindow || winLabel === (weeksParam === 6 ? "6w" : "2w");
    const reminderLabel = weeksParam === 6 ? "6w" : "2w";

    // Hub settings — default to no-send if association hasn't opted in
    const hub     = hubMap.get(assocId) ?? mergeCommunicationHubSettings(null);
    const enabled = hub.seasonalReminderEnabled === true;

    const assocResult = {
      associationId: assocId, name: assocName,
      seasonStartMonth, daysUntilSeasonStart: daysUntil,
      inWindow, enabled,
      scanned: 0, sent: 0, skipped: 0, failed: 0,
    };
    assocResults.push(assocResult);

    if (!inWindow || !enabled) continue;

    const currentYear  = currentSeasonYearFor(seasonStartMonth);
    const upcomingYear = upcomingSeasonYearFor(seasonStartMonth);

    // ── Step 1: Find all approved seasonal role-requests for this association ─
    // Covers both association-scoped roles and club-scoped roles whose clubs
    // belong to this association.
    const clubIds = assocClubIds.get(assocId) ?? [];

    const approvedCandidates = await db
      .collection("role_requests")
      .find({
        status:        "approved",
        seasonYear:    currentYear,
        requestedRole: { $in: SEASONAL_ROLES },
        $or: [
          { scopeType: "association", scopeId: assocId },
          ...(clubIds.length > 0
            ? [{ scopeType: "club", scopeId: { $in: clubIds } }]
            : []),
        ],
      }, {
        projection: {
          requestId: 1, memberId: 1, requestedRole: 1,
          scopeType: 1, scopeId: 1, scopeName: 1, seasonYear: 1,
        },
      })
      .toArray();

    if (approvedCandidates.length === 0) continue;

    // ── Step 2: Find which candidates already have an upcoming-season request ──
    const candidateMemberIds = [...new Set(approvedCandidates.map((r) => String(r.memberId ?? "")))];

    const upcomingRequests = await db
      .collection("role_requests")
      .find({
        memberId:      { $in: candidateMemberIds },
        seasonYear:    upcomingYear,
        requestedRole: { $in: SEASONAL_ROLES },
        status:        { $nin: ["rejected", "withdrawn"] },
      }, {
        projection: { memberId: 1, requestedRole: 1, scopeId: 1 },
      })
      .toArray();

    const upcomingSet = new Set(
      upcomingRequests.map(
        (r) => `${r.memberId}::${r.requestedRole}::${String(r.scopeId ?? "")}`,
      ),
    );

    // ── Step 3: Filter out those who already received this reminder wave ──────
    const existingLogs = await db
      .collection("reminder_log")
      .find({
        type:               "seasonal_registration",
        upcomingSeasonYear: upcomingYear,
        reminderLabel,
        memberId:           { $in: candidateMemberIds },
      }, {
        projection: { memberId: 1, requestedRole: 1, scopeId: 1 },
      })
      .toArray();

    const loggedSet = new Set(
      existingLogs.map(
        (l) => `${l.memberId}::${l.requestedRole}::${String(l.scopeId ?? "")}`,
      ),
    );

    // ── Step 4: Load member contact info in bulk ───────────────────────────────
    const memberDocs = await db
      .collection("members")
      .find(
        { memberId: { $in: candidateMemberIds } },
        { projection: { memberId: 1, personalInfo: 1, contact: 1 } },
      )
      .toArray();

    const memberMap = new Map(
      memberDocs.map((m) => [String(m.memberId ?? ""), m]),
    );

    // ── Step 5: Send reminders ────────────────────────────────────────────────
    for (const rr of approvedCandidates) {
      assocResult.scanned++;
      totals.scanned++;

      const memberIdStr    = String(rr.memberId ?? "");
      const requestedRole  = String(rr.requestedRole ?? "") as UserRole;
      const scopeIdStr     = String(rr.scopeId ?? "");
      const dedupeKey      = `${memberIdStr}::${requestedRole}::${scopeIdStr}`;

      // Already has upcoming-season request
      if (upcomingSet.has(dedupeKey)) {
        assocResult.skipped++;
        totals.skipped++;
        continue;
      }
      // Already received this reminder
      if (loggedSet.has(dedupeKey)) {
        assocResult.skipped++;
        totals.skipped++;
        continue;
      }

      const member = memberMap.get(memberIdStr);
      const email  = (
        member?.contact?.primaryEmail as string | undefined
      )?.trim() || null;

      if (!email) {
        assocResult.skipped++;
        totals.skipped++;
        console.warn(
          `[seasonal-reminder] no email for memberId="${memberIdStr}" — skipping`,
        );
        continue;
      }

      const firstName = (
        member?.personalInfo?.firstName as string | undefined
      )?.trim() || "Member";

      const roleDef   = ROLE_DEFINITIONS[requestedRole];
      const roleLabel = roleDef?.label ?? requestedRole;

      // Scope display name: stored on RR, or look up club name, or assoc name
      const scopeName =
        (rr.scopeName as string | undefined)?.trim() ||
        (rr.scopeType === "club" ? clubNameMap.get(scopeIdStr) : null) ||
        assocName;

      const scopeType = (rr.scopeType as "club" | "association" | "team") ?? "club";

      if (dryRun) {
        console.info(
          `[seasonal-reminder][dryRun] Would send ${reminderLabel} reminder ` +
          `to ${email} (memberId="${memberIdStr}", role="${roleLabel}", scope="${scopeName}", ` +
          `upcoming="${upcomingYear}")`,
        );
        assocResult.sent++;
        totals.sent++;
        continue;
      }

      // Build and send email
      const emailContent = buildSeasonalRegistrationReminderEmail({
        firstName,
        roleLabel,
        scopeName,
        scopeType,
        currentSeasonYear:  currentYear,
        upcomingSeasonYear: upcomingYear,
        weeksLabel:         reminderLabel,
        customText:         hub.seasonalReminderCustomText,
      });

      const result = await sendEmail({
        to:      email,
        subject: emailContent.subject,
        html:    emailContent.html,
        text:    emailContent.text,
      });

      if (result.success) {
        // Log the send so we don't re-send in subsequent runs
        await db.collection("reminder_log").insertOne({
          type:               "seasonal_registration",
          memberId:           memberIdStr,
          requestedRole,
          scopeId:            scopeIdStr || null,
          upcomingSeasonYear: upcomingYear,
          reminderLabel,
          associationId:      assocId,
          sentAt:             new Date(),
        });
        assocResult.sent++;
        totals.sent++;
      } else {
        console.error(
          `[seasonal-reminder] send failed for ${email}: ${result.error}`,
        );
        assocResult.failed++;
        totals.failed++;
      }
    }
  }

  return NextResponse.json({
    ok:                true,
    dryRun,
    weeksParam,
    forcedWindow:      forceWindow,
    associations:      assocResults,
    totals,
  });
}
