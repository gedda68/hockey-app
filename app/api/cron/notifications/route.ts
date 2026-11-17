/**
 * GET /api/cron/notifications
 *
 * Hourly job: brings the notifications of everyone who has email, SMS or WhatsApp switched on up to date, so those messages
 * go out even if the member hasn't opened the app. (In-app-only members are refreshed when they open the app.)
 * The stalest members go first and a time budget stops the run cleanly, so a big club simply takes a few runs.
 *
 * It also publishes scheduled Facebook page posts that have come due.
 *
 * Auth: Bearer CRON_SECRET (Vercel sends this) or ?secret=. 401 if wrong, 503 if CRON_SECRET isn't set.
 * Params: ?limit=<n> (default 300), ?budgetSeconds=<n> (default 45), ?dryRun=true (just counts who would be refreshed)
 */

import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { refreshForMember } from "@/lib/notifications/engine";
import { processDuePosts } from "@/lib/social/posts";
import { pruneDeliveries } from "@/lib/notifications/deliveryLog";
import { membersWithExtraChannelsFilter } from "@/lib/notifications/cronFilter";

export const maxDuration = 60;

function authorized(request: NextRequest): boolean {
  const secret = String(process.env.CRON_SECRET ?? "").trim();
  if (!secret) return false;
  const auth = request.headers.get("authorization") ?? "";
  const bearer = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  return bearer === secret || request.nextUrl.searchParams.get("secret") === secret;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!String(process.env.CRON_SECRET ?? "").trim()) return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 503 });
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sp = request.nextUrl.searchParams;
  const limit = Math.min(Math.max(Number(sp.get("limit")) || 300, 1), 2000);
  const budgetMs = Math.min(Math.max(Number(sp.get("budgetSeconds")) || 45, 5), 55) * 1000;
  const dryRun = sp.get("dryRun") === "true";

  try {
    const db = await getDatabase();
    const members = await db
      .collection("members")
      .find(membersWithExtraChannelsFilter(), { projection: { memberId: 1 } })
      .sort({ notificationsRefreshedAt: 1 })
      .limit(limit)
      .toArray();
    if (dryRun) return NextResponse.json({ ok: true, dryRun: true, eligible: members.length });

    const started = Date.now();
    let refreshed = 0;
    let failed = 0;
    for (const m of members) {
      if (Date.now() - started > budgetMs) break;
      if (!m.memberId) continue;
      try { await refreshForMember(db, String(m.memberId)); refreshed++; }
      catch (e) { failed++; console.error("notification cron: refresh failed for", m.memberId, e); }
    }
    const pruned = await pruneDeliveries(db).catch(() => 0);
    // Scheduled posts to Facebook pages that have come due.
    const social = await processDuePosts(db).catch(() => ({ posted: 0, failed: 0 }));
    return NextResponse.json({ ok: true, pruned, social, eligible: members.length, refreshed, failed, stoppedEarly: refreshed + failed < members.length });
  } catch (e) {
    console.error("notifications cron error:", e);
    return NextResponse.json({ error: "Job failed" }, { status: 500 });
  }
}
