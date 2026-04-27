/**
 * GET /api/cron/weekly-digest
 *
 * W6 — Weekly association digest email.
 *
 * - Opt-in via `communication_hub_settings.weeklyDigestEnabled`
 * - Deduped via `reminder_log` with { type: "weekly_digest", associationId, weekKey, memberId }
 *
 * Query params:
 *   ?secret=CRON_SECRET   (or Bearer auth)
 *   ?dryRun=true
 *   ?associationId=bha    (optional: single association)
 */

import { NextRequest, NextResponse } from "next/server";
import type { Db } from "mongodb";
import { getDatabase } from "@/lib/mongodb";
import {
  mergeCommunicationHubSettings,
} from "@/lib/communications/communicationHubSettings";
import { sendEmail } from "@/lib/email/client";
import { buildWeeklyDigestEmail, type WeeklyDigestMatch } from "@/lib/email/templates/weeklyDigest";
import { publicNewsMongoFilterForAssociationHub } from "@/lib/portal/newsScope";
import { queryActiveNews } from "@/lib/data/publicNews";

function authorizeCron(request: NextRequest): boolean {
  const secret = String(process.env.CRON_SECRET ?? "").trim();
  if (!secret) return false;
  const auth = request.headers.get("authorization") ?? "";
  const bearer = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  const qp = request.nextUrl.searchParams.get("secret") ?? "";
  return bearer === secret || qp === secret;
}

function utcDayKey(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Monday-based week key (UTC): weekStart YYYY-MM-DD for the week containing `now`. */
function weekKeyUtc(now: Date): { weekKey: string; weekLabel: string } {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  // getUTCDay: Sun=0..Sat=6. Convert so Mon=0..Sun=6
  const mon0 = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - mon0);
  const weekKey = utcDayKey(d);
  const weekLabel = `Week of ${d.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })}`;
  return { weekKey, weekLabel };
}

function memberEmailFromDoc(member: Record<string, unknown>): string | null {
  const contact = member.contact as Record<string, unknown> | undefined;
  for (const v of [contact?.primaryEmail, contact?.email, (member as any).primaryEmail]) {
    if (typeof v === "string" && v.includes("@")) return v.trim();
  }
  return null;
}

async function loadDigestFixtures(
  db: Db,
  associationId: string,
  now: Date,
): Promise<{ upcoming: WeeklyDigestMatch[]; recentResults: WeeklyDigestMatch[] }> {
  const start = new Date(now);
  const endUpcoming = new Date(now.getTime() + 7 * 86_400_000);
  const startResults = new Date(now.getTime() - 7 * 86_400_000);

  const [upcomingRows, resultRows] = await Promise.all([
    db
      .collection("league_fixtures")
      .find(
        {
          owningAssociationId: associationId,
          scheduledStart: { $gte: start.toISOString(), $lt: endUpcoming.toISOString() },
          fixtureStatus: { $in: ["published", "in_progress", "completed"] },
        },
        {
          projection: {
            scheduledStart: 1,
            venueName: 1,
            seasonCompetitionId: 1,
            round: 1,
            divisionName: 1,
            homeTeamName: 1,
            awayTeamName: 1,
          },
        },
      )
      .sort({ scheduledStart: 1 })
      .limit(50)
      .toArray(),
    db
      .collection("league_fixtures")
      .find(
        {
          owningAssociationId: associationId,
          scheduledStart: { $gte: startResults.toISOString(), $lt: start.toISOString() },
          fixtureStatus: { $in: ["completed"] },
          "result.homeScore": { $type: "number" },
          "result.awayScore": { $type: "number" },
        },
        {
          projection: {
            scheduledStart: 1,
            venueName: 1,
            seasonCompetitionId: 1,
            round: 1,
            divisionName: 1,
            homeTeamName: 1,
            awayTeamName: 1,
            result: 1,
          },
        },
      )
      .sort({ scheduledStart: -1 })
      .limit(50)
      .toArray(),
  ]);

  const mapUpcoming = (r: any): WeeklyDigestMatch => ({
    scheduledStart: typeof r.scheduledStart === "string" ? r.scheduledStart : null,
    venueName: typeof r.venueName === "string" ? r.venueName : null,
    seasonCompetitionId: String(r.seasonCompetitionId ?? ""),
    round: typeof r.round === "number" ? r.round : null,
    divisionName: typeof r.divisionName === "string" ? r.divisionName : null,
    homeTeamName: String(r.homeTeamName ?? "Home"),
    awayTeamName: String(r.awayTeamName ?? "Away"),
    homeScore: null,
    awayScore: null,
  });

  const mapResult = (r: any): WeeklyDigestMatch => ({
    scheduledStart: typeof r.scheduledStart === "string" ? r.scheduledStart : null,
    venueName: typeof r.venueName === "string" ? r.venueName : null,
    seasonCompetitionId: String(r.seasonCompetitionId ?? ""),
    round: typeof r.round === "number" ? r.round : null,
    divisionName: typeof r.divisionName === "string" ? r.divisionName : null,
    homeTeamName: String(r.homeTeamName ?? "Home"),
    awayTeamName: String(r.awayTeamName ?? "Away"),
    homeScore: typeof r.result?.homeScore === "number" ? r.result.homeScore : null,
    awayScore: typeof r.result?.awayScore === "number" ? r.result.awayScore : null,
  });

  return {
    upcoming: upcomingRows.map(mapUpcoming),
    recentResults: resultRows.map(mapResult),
  };
}

export async function GET(request: NextRequest) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!String(process.env.CRON_SECRET ?? "").trim()) {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 503 });
  }

  const sp = request.nextUrl.searchParams;
  const dryRun = sp.get("dryRun") === "true";
  const onlyAssociationId = sp.get("associationId")?.trim() || null;

  const db = await getDatabase();
  const now = new Date();
  const { weekKey, weekLabel } = weekKeyUtc(now);

  const assocFilter: Record<string, unknown> = onlyAssociationId
    ? { associationId: onlyAssociationId }
    : {};

  const associations = await db
    .collection("associations")
    .find(assocFilter, { projection: { associationId: 1, name: 1, fullName: 1 } })
    .limit(500)
    .toArray();

  const assocIds = associations.map((a) => String((a as any).associationId ?? "")).filter(Boolean);

  // Load comms hub settings rows in bulk
  const hubRows = await db
    .collection("communication_hub_settings")
    .find(
      { scopeType: "association", scopeId: { $in: assocIds } },
      { projection: { scopeId: 1, weeklyDigestEnabled: 1, weeklyDigestIntroText: 1 } },
    )
    .toArray();
  const hubMap = new Map<string, ReturnType<typeof mergeCommunicationHubSettings>>();
  for (const r of hubRows) {
    const scopeId = String((r as any).scopeId ?? "").trim();
    if (!scopeId) continue;
    hubMap.set(scopeId, mergeCommunicationHubSettings(r as any));
  }

  const results: Array<{
    associationId: string;
    enabled: boolean;
    scanned: number;
    sent: number;
    skipped: number;
    failed: number;
  }> = [];

  const totals = { scanned: 0, sent: 0, skipped: 0, failed: 0 };

  for (const assoc of associations as any[]) {
    const associationId = String(assoc.associationId ?? "").trim();
    const associationName = String(assoc.fullName ?? assoc.name ?? associationId);
    const hub = hubMap.get(associationId) ?? mergeCommunicationHubSettings(null);
    const enabled = !!hub.weeklyDigestEnabled;

    const row = { associationId, enabled, scanned: 0, sent: 0, skipped: 0, failed: 0 };
    results.push(row);

    if (!enabled) continue;

    // Prepare digest content once per association
    const { upcoming, recentResults } = await loadDigestFixtures(db, associationId, now);
    const newsItems = await queryActiveNews(
      db,
      publicNewsMongoFilterForAssociationHub(associationId),
      6,
    );

    const emailContent = buildWeeklyDigestEmail({
      associationName,
      introText: hub.weeklyDigestIntroText,
      weekLabel,
      upcoming,
      recentResults,
      news: newsItems.map((n) => ({
        id: n.id,
        title: n.title,
        publishDate: n.publishDate ? n.publishDate.toISOString() : null,
      })),
    });

    // Recipients: members with an active email and any role scoped to association or its clubs.
    // We keep this conservative and rely on scopeId matching for inclusion.
    const clubIds = await db
      .collection("clubs")
      .find({ parentAssociationId: associationId }, { projection: { id: 1 } })
      .toArray();
    const scopeIds = [associationId, ...clubIds.map((c) => String((c as any).id ?? "")).filter(Boolean)];

    const members = await db
      .collection("members")
      .find(
        { "roles.scopeId": { $in: scopeIds }, "contact.primaryEmail": { $exists: true, $ne: "" } },
        { projection: { memberId: 1, personalInfo: 1, contact: 1 } },
      )
      .limit(5000)
      .toArray();

    const memberIds = members.map((m) => String((m as any).memberId ?? "")).filter(Boolean);

    const existingLogs = await db
      .collection("reminder_log")
      .find(
        { type: "weekly_digest", associationId, weekKey, memberId: { $in: memberIds } },
        { projection: { memberId: 1 } },
      )
      .toArray();
    const sentSet = new Set(existingLogs.map((l) => String((l as any).memberId ?? "")));

    for (const m of members as any[]) {
      row.scanned++;
      totals.scanned++;

      const memberId = String(m.memberId ?? "");
      if (!memberId) {
        row.skipped++; totals.skipped++;
        continue;
      }
      if (sentSet.has(memberId)) {
        row.skipped++; totals.skipped++;
        continue;
      }

      const to = memberEmailFromDoc(m);
      if (!to) {
        row.skipped++; totals.skipped++;
        continue;
      }

      if (dryRun) {
        row.sent++; totals.sent++;
        continue;
      }

      const sendRes = await sendEmail({
        to,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
      });

      if (!sendRes.success) {
        row.failed++; totals.failed++;
        continue;
      }

      row.sent++; totals.sent++;
      await db.collection("reminder_log").insertOne({
        type: "weekly_digest",
        associationId,
        weekKey,
        memberId,
        createdAt: new Date().toISOString(),
      });
    }
  }

  return NextResponse.json({
    ok: true,
    dryRun,
    weekKey,
    weekLabel,
    associations: results,
    totals,
  });
}

