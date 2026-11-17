/**
 * GET /api/member/coming-up
 * The signed-in member's next two weeks: matches they play, coach or manage, umpiring appointments, training,
 * events, nomination deadlines, and unread notifications. Scoped to the session; nothing for other people.
 */

import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";
import { resolveSessionMemberId } from "@/lib/auth/sessionMember";
import { gatherCandidates } from "@/lib/notifications/engine";
import { assemble, matchItem, rolesOnTeam, type ComingUpItem } from "@/lib/comingUp/build";
import { umpireIdKeysFromRegister } from "@/lib/member/umpireSelfService";

const DAY = 86400000;

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const db = await getDatabase();
    const me = await resolveSessionMemberId(db, session);
    if (!me) return NextResponse.json({ upcoming: [], notifications: [], unread: 0 });

    const now = new Date();
    const until = new Date(now.getTime() + 14 * DAY);
    const items: ComingUpItem[] = [];

    const member = await db.collection("members").findOne({ memberId: me }, { projection: { roleHoldings: 1, clubId: 1, "membership.clubId": 1 } });
    const holdings = Array.isArray(member?.roleHoldings) ? (member!.roleHoldings as any[]) : [];
    const heldTeamIds = holdings.flatMap((h) => (Array.isArray(h.teamIds) ? h.teamIds.map(String) : []));

    // Matches and training for the teams I play in, coach or manage.
    const teams = await db.collection("teams").find({ $or: [{ "roster.memberId": me }, ...(heldTeamIds.length ? [{ teamId: { $in: heldTeamIds } }] : [])] }, { projection: { teamId: 1, name: 1, displayName: 1, roster: 1, clubId: 1 } }).toArray();
    const rolesByTeam = new Map<string, ReturnType<typeof rolesOnTeam>>();
    for (const t of teams) { const r = rolesOnTeam(t, me, holdings, now); if (r.length) rolesByTeam.set(String(t.teamId), r); }
    const myTeamIds = new Set(rolesByTeam.keys());
    if (myTeamIds.size) {
      const fixtures = (await db.collection("league_fixtures").find(
        { $or: [{ homeTeamId: { $in: [...myTeamIds] } }, { awayTeamId: { $in: [...myTeamIds] } }], scheduledStart: { $gte: now.toISOString(), $lte: until.toISOString() } },
        { projection: { fixtureId: 1, homeTeamId: 1, awayTeamId: 1, scheduledStart: 1, venueName: 1, round: 1 } },
      ).limit(60).toArray()) as any[];
      const ids = new Set<string>(myTeamIds);
      for (const f of fixtures) { if (f.homeTeamId) ids.add(String(f.homeTeamId)); if (f.awayTeamId) ids.add(String(f.awayTeamId)); }
      const named = await db.collection("teams").find({ teamId: { $in: [...ids] } }, { projection: { teamId: 1, name: 1, displayName: 1 } }).toArray();
      const names = new Map(named.map((t) => [String(t.teamId), String(t.displayName || t.name || "")]));
      for (const f of fixtures) {
        const mine = myTeamIds.has(String(f.homeTeamId)) ? String(f.homeTeamId) : String(f.awayTeamId);
        const it = matchItem(f, myTeamIds, names, rolesByTeam.get(mine) ?? []);
        if (it) items.push(it);
      }
      const clubIds = [...new Set(teams.map((t) => String(t.clubId ?? "")).filter(Boolean))];
      const sessions = clubIds.length
        ? await db.collection("training_sessions").find({ clubId: { $in: clubIds }, status: { $ne: "cancelled" }, startAt: { $gte: now.toISOString(), $lte: until.toISOString() }, $or: [{ teamId: null }, { teamId: { $in: [...myTeamIds] } }] }, { projection: { sessionId: 1, title: 1, startAt: 1, location: 1, teamId: 1 } }).limit(40).toArray()
        : [];
      for (const s of sessions as any[]) {
        items.push({ id: `training:${s.sessionId}`, kind: "training", title: String(s.title), detail: String(s.location ?? ""), at: String(s.startAt), link: "/admin/training", tag: "Training" });
      }
    }

    // Umpiring and technical appointments.
    const regs = await db.collection("association_official_register").find({ memberId: me, isActive: { $ne: false } }).project({ umpireNumber: 1 }).toArray();
    const idList = [...umpireIdKeysFromRegister(me, regs)];
    if (idList.length) {
      const fx = (await db.collection("league_fixtures").find(
        { umpires: { $elemMatch: { umpireId: { $in: idList } } }, scheduledStart: { $gte: now.toISOString(), $lte: until.toISOString() } },
        { projection: { fixtureId: 1, scheduledStart: 1, venueName: 1, round: 1, umpires: 1, homeTeamId: 1, awayTeamId: 1 } },
      ).limit(60).toArray()) as any[];
      for (const f of fx) {
        const slot = (f.umpires as any[]).find((u) => idList.includes(String(u?.umpireId)));
        const declined = slot?.allocationStatus === "declined";
        if (declined) continue;
        items.push({ id: `umpire:${f.fixtureId}`, kind: "umpire", title: "Umpiring", detail: [f.round ? `Round ${f.round}` : "", f.venueName ?? "", slot?.allocationStatus === "offered" ? "Awaiting your reply" : ""].filter(Boolean).join(" · "), at: String(f.scheduledStart), link: "/admin/my-duties", tag: slot?.umpireType ? String(slot.umpireType) : "Umpire" });
      }
    }

    // Events and nomination deadlines come from the same place the notifications do.
    const { candidates } = await gatherCandidates(db, me, now);
    for (const c of candidates) {
      if (c.category === "events") items.push({ id: `event:${c.dedupeKey}`, kind: "event", title: c.title, detail: c.message, at: c.eventAt, link: c.link, tag: "Event" });
      if (c.category === "nominations") items.push({ id: `nom:${c.dedupeKey}`, kind: "nomination", title: c.title, detail: c.message, at: c.eventAt, link: "/admin/nominate", tag: "Deadline" });
    }

    // Unread notifications.
    const unreadDocs = await db.collection("member_notifications").find({ memberId: me, dismissedAt: null, readAt: null, expiresAt: { $gt: now.toISOString() } }, { projection: { notificationId: 1, title: 1, message: 1, link: 1, eventAt: 1, createdAt: 1 } }).sort({ eventAt: -1 }).limit(20).toArray();
    for (const n of unreadDocs as any[]) {
      items.push({ id: `note:${n.notificationId}`, kind: "notification", title: String(n.title), detail: String(n.message ?? ""), at: String(n.eventAt ?? n.createdAt ?? now.toISOString()), link: String(n.link || "/admin/notifications") });
    }

    const { upcoming, notifications } = assemble(items, now);
    return NextResponse.json({ upcoming, notifications, unread: unreadDocs.length });
  } catch (e) {
    console.error("coming-up GET error:", e);
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }
}
