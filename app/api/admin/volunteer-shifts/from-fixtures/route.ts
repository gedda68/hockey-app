/**
 * POST /api/admin/volunteer-shifts/from-fixtures
 * { from, to, templates: [{ kind: "canteen"|"scoring"|"ground_setup", enabled, slots }], dryRun?, clubId? }
 * Plans canteen, scoring and ground set-up shifts around the club's home matches. dryRun only reports; otherwise creates them.
 * Matches that already have their shifts (from an earlier run) are skipped.
 */

import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";
import { SHIFTS, coordinatedClub } from "@/lib/volunteers/access";
import { planShifts, type PlanTemplate } from "@/lib/volunteers/plan";
import { newId } from "@/lib/volunteers/service";
import { todayInZone } from "@/lib/member/availability";

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const OFFSET = "+10:00";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const body = await request.json().catch(() => ({}));
    const db = await getDatabase();
    const club = await coordinatedClub(session, db, body?.clubId);
    if (!club) return NextResponse.json({ error: "You can't manage volunteer shifts" }, { status: 403 });

    const today = todayInZone();
    const from = DAY_RE.test(String(body.from)) && body.from >= today ? String(body.from) : today;
    const to = DAY_RE.test(String(body.to)) ? String(body.to) : "";
    if (!to || to < from) return NextResponse.json({ error: "Choose the dates to cover" }, { status: 400 });
    if (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`) > 150 * 86400000) return NextResponse.json({ error: "Choose a period of about five months or less" }, { status: 400 });
    const templates: PlanTemplate[] = (["ground_setup", "canteen", "scoring"] as const).map((kind) => {
      const t = (Array.isArray(body.templates) ? body.templates : []).find((x: { kind?: string }) => x?.kind === kind) ?? {};
      return { kind, enabled: t.enabled === true, slots: Math.min(30, Math.max(1, Math.round(Number(t.slots) || 1))) };
    });
    if (!templates.some((t) => t.enabled)) return NextResponse.json({ error: "Choose at least one kind of shift" }, { status: 400 });

    const teams = await db.collection("teams").find({ clubId: club.clubId, status: { $ne: "archived" } }, { projection: { teamId: 1, name: 1, displayName: 1 } }).limit(300).toArray();
    const nameOf = new Map(teams.map((t) => [String(t.teamId), String(t.displayName || t.name || "")]));
    const fixtures = await db.collection("league_fixtures").find(
      { homeTeamId: { $in: [...nameOf.keys()] }, scheduledStart: { $gte: new Date(`${from}T00:00:00${OFFSET}`).toISOString(), $lt: new Date(Date.parse(`${to}T00:00:00${OFFSET}`) + 86400000).toISOString() }, status: { $nin: ["cancelled", "completed", "postponed"] } },
      { projection: { fixtureId: 1, scheduledStart: 1, venueName: 1, homeTeamId: 1, awayTeamId: 1 } },
    ).sort({ scheduledStart: 1 }).limit(600).toArray();
    const awayIds = [...new Set(fixtures.map((f) => String(f.awayTeamId ?? "")).filter(Boolean))];
    const away = awayIds.length ? await db.collection("teams").find({ teamId: { $in: awayIds } }, { projection: { teamId: 1, name: 1, displayName: 1 } }).toArray() : [];
    const awayName = new Map(away.map((t) => [String(t.teamId), String(t.displayName || t.name || "")]));

    const plan = planShifts(fixtures.map((f) => ({ fixtureId: String(f.fixtureId), startsAt: String(f.scheduledStart), venue: f.venueName ? String(f.venueName) : undefined, label: `${nameOf.get(String(f.homeTeamId)) ?? ""} v ${awayName.get(String(f.awayTeamId)) ?? "TBC"}`.trim() })), templates);
    const have = new Set((await db.collection(SHIFTS).find({ clubId: club.clubId, autoKey: { $in: plan.map((p) => p.autoKey) } }, { projection: { autoKey: 1 } }).toArray()).map((s) => String(s.autoKey)));
    const fresh = plan.filter((p) => !have.has(p.autoKey) && p.date >= today);
    const summary = { matches: fixtures.length, days: new Set(plan.map((p) => p.date)).size, planned: fresh.length, alreadyDone: plan.filter((p) => have.has(p.autoKey)).length };

    if (body.dryRun === true) return NextResponse.json({ ...summary, preview: fresh.slice(0, 40) });
    if (!fresh.length) return NextResponse.json({ ...summary, created: 0 });
    const now = new Date().toISOString();
    await db.collection(SHIFTS).insertMany(fresh.map((p) => ({ shiftId: newId("VSH"), clubId: club.clubId, clubName: club.name, ...p, status: "open", createdBy: String(session.memberId ?? session.userId ?? ""), createdAt: now })));
    return NextResponse.json({ ...summary, created: fresh.length }, { status: 201 });
  } catch (e) {
    console.error("shifts from fixtures error:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
