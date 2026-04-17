/**
 * Weekly fan tips email (B3). Secure with CRON_SECRET (Authorization: Bearer or ?secret=).
 */

import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { sendWeeklyFanTipsEmail } from "@/lib/email/weeklyFanTipsDigest";
import { memberPrimaryEmail, normalizeFanPreferences } from "@/lib/member/fanPreferences";

function authorizeCron(request: NextRequest): boolean {
  const secret = String(process.env.CRON_SECRET ?? "").trim();
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  const bearer = auth?.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  const qp = request.nextUrl.searchParams.get("secret");
  return bearer === secret || qp === secret;
}

export async function GET(request: NextRequest) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!String(process.env.CRON_SECRET ?? "").trim()) {
    return NextResponse.json({ error: "CRON_SECRET is not set" }, { status: 503 });
  }

  const db = await getDatabase();
  const rows = await db
    .collection("members")
    .find(
      { "fanPreferences.weeklyTipsEmail": true },
      { projection: { fanPreferences: 1, contact: 1, personalInfo: 1 } },
    )
    .limit(2000)
    .toArray();

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const m of rows) {
    const fp = normalizeFanPreferences((m as { fanPreferences?: unknown }).fanPreferences);
    if (!fp.weeklyTipsEmail) {
      skipped++;
      continue;
    }
    const to = memberPrimaryEmail(m as Record<string, unknown>);
    if (!to) {
      skipped++;
      continue;
    }
    const rec = m as { personalInfo?: { displayName?: string } };
    const displayName = String(rec.personalInfo?.displayName ?? "there").trim() || "there";
    const ok = await sendWeeklyFanTipsEmail(to, displayName);
    if (ok) sent++;
    else failed++;
  }

  return NextResponse.json({ ok: true, scanned: rows.length, sent, skipped, failed });
}
