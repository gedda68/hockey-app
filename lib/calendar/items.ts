// lib/calendar/items.ts — what goes on a person's calendar: their matches and training, umpiring, volunteer shifts and events.

import type { Db } from "mongodb";
import { roleTag, rolesOnTeam } from "@/lib/comingUp/build";
import { umpireIdKeysFromRegister } from "@/lib/member/umpireSelfService";
import { brisbaneTime, type CalItem, type CalStatus } from "@/lib/calendar/ics";

export interface Includes { matches: boolean; training: boolean; duties: boolean; shifts: boolean; events: boolean }
export const DEFAULT_INCLUDES: Includes = { matches: true, training: true, duties: true, shifts: true, events: false };
export const cleanIncludes = (raw: any, base: Includes = DEFAULT_INCLUDES): Includes => ({
  matches: typeof raw?.matches === "boolean" ? raw.matches : base.matches, training: typeof raw?.training === "boolean" ? raw.training : base.training,
  duties: typeof raw?.duties === "boolean" ? raw.duties : base.duties, shifts: typeof raw?.shifts === "boolean" ? raw.shifts : base.shifts,
  events: typeof raw?.events === "boolean" ? raw.events : base.events,
});

const DAY = 86400_000;
const MATCH_MIN = 90, DUTY_MIN = 105, TRAINING_MIN = 90;
const statusOf = (s: unknown): CalStatus => (/cancel/i.test(String(s ?? "")) ? "CANCELLED" : /postpone/i.test(String(s ?? "")) ? "TENTATIVE" : "CONFIRMED");

/** The next year ahead and the last month, for one member. `prefix` names a child so parents can tell calendars apart. */
export async function calendarItems(db: Db, memberId: string, o: { includes: Includes; now: Date; origin?: string; prefix?: string }): Promise<CalItem[]> {
  const { includes: inc, now } = o;
  const from = new Date(now.getTime() - 30 * DAY), to = new Date(now.getTime() + 365 * DAY);
  const pre = o.prefix ? `${o.prefix}: ` : "";
  const link = (path: string) => (o.origin ? `${o.origin}${path}` : undefined);
  const items: CalItem[] = [];

  const member: any = await db.collection("members").findOne({ memberId }, { projection: { roleHoldings: 1, clubId: 1, associationId: 1, "membership.clubId": 1, "membership.associationId": 1 } });
  if (!member) return items;
  const holdings: any[] = Array.isArray(member.roleHoldings) ? member.roleHoldings : [];
  const heldTeamIds = holdings.flatMap((h) => (Array.isArray(h.teamIds) ? h.teamIds.map(String) : []));

  if (inc.matches || inc.training) {
    const teams: any[] = await db.collection("teams").find({ $or: [{ "roster.memberId": memberId }, ...(heldTeamIds.length ? [{ teamId: { $in: heldTeamIds } }] : [])] }, { projection: { teamId: 1, name: 1, displayName: 1, roster: 1, clubId: 1 } }).limit(60).toArray();
    const rolesByTeam = new Map<string, ReturnType<typeof rolesOnTeam>>();
    for (const t of teams) { const r = rolesOnTeam(t, memberId, holdings, now); if (r.length) rolesByTeam.set(String(t.teamId), r); }
    const myTeamIds = [...rolesByTeam.keys()];
    if (myTeamIds.length && inc.matches) {
      const fixtures: any[] = await db.collection("league_fixtures").find(
        { $or: [{ homeTeamId: { $in: myTeamIds } }, { awayTeamId: { $in: myTeamIds } }], scheduledStart: { $gte: from.toISOString(), $lte: to.toISOString() } },
        { projection: { fixtureId: 1, homeTeamId: 1, awayTeamId: 1, scheduledStart: 1, venueName: 1, round: 1, status: 1, durationMinutes: 1 } },
      ).limit(500).toArray();
      const ids = new Set<string>(myTeamIds);
      for (const f of fixtures) { if (f.homeTeamId) ids.add(String(f.homeTeamId)); if (f.awayTeamId) ids.add(String(f.awayTeamId)); }
      const named: any[] = await db.collection("teams").find({ teamId: { $in: [...ids] } }, { projection: { teamId: 1, name: 1, displayName: 1 } }).limit(600).toArray();
      const names = new Map(named.map((t) => [String(t.teamId), String(t.displayName || t.name || "")]));
      for (const f of fixtures) {
        if (!f.scheduledStart) continue;
        const home = String(f.homeTeamId ?? ""), away = String(f.awayTeamId ?? "");
        const mine = rolesByTeam.has(home) ? home : rolesByTeam.has(away) ? away : "";
        if (!mine) continue;
        const opp = mine === home ? away : home, start = new Date(String(f.scheduledStart));
        items.push({
          uid: `match-${f.fixtureId}-${mine}-${memberId}`, title: `${pre}${names.get(mine) || "Your team"} v ${names.get(opp) || "TBC"}`, start,
          end: new Date(start.getTime() + (Number(f.durationMinutes) || MATCH_MIN) * 60_000), location: f.venueName ? String(f.venueName) : undefined,
          description: [f.round ? `Round ${f.round}` : "", roleTag(rolesByTeam.get(mine) ?? []), mine === home ? "Home" : "Away"].filter(Boolean).join(" · "),
          url: link("/admin/dashboard"), status: statusOf(f.status), alarmMinutes: 60,
        });
      }
    }
    if (myTeamIds.length && inc.training) {
      const clubIds = [...new Set(teams.map((t) => String(t.clubId ?? "")).filter(Boolean))];
      const sessions: any[] = clubIds.length ? await db.collection("training_sessions").find({ clubId: { $in: clubIds }, startAt: { $gte: from.toISOString(), $lte: to.toISOString() }, $or: [{ teamId: null }, { teamId: { $in: myTeamIds } }] }, { projection: { sessionId: 1, title: 1, startAt: 1, endAt: 1, location: 1, status: 1, focus: 1 } }).limit(500).toArray() : [];
      for (const s of sessions) {
        const start = new Date(String(s.startAt)), end = s.endAt ? new Date(String(s.endAt)) : new Date(start.getTime() + TRAINING_MIN * 60_000);
        items.push({ uid: `training-${s.sessionId}-${memberId}`, title: `${pre}${s.title || "Training"}`, start, end, location: s.location ? String(s.location) : undefined, description: s.focus ? String(s.focus) : undefined, url: link("/admin/training"), status: statusOf(s.status), alarmMinutes: 60 });
      }
    }
  }

  if (inc.duties) {
    const regs = await db.collection("association_official_register").find({ memberId, isActive: { $ne: false } }).project({ umpireNumber: 1 }).toArray();
    const idList = [...umpireIdKeysFromRegister(memberId, regs)];
    const fx: any[] = await db.collection("league_fixtures").find({ umpires: { $elemMatch: { umpireId: { $in: idList } } }, scheduledStart: { $gte: from.toISOString(), $lte: to.toISOString() } }, { projection: { fixtureId: 1, scheduledStart: 1, venueName: 1, round: 1, umpires: 1, homeTeamId: 1, awayTeamId: 1, status: 1 } }).limit(300).toArray();
    const tids = [...new Set(fx.flatMap((f) => [f.homeTeamId, f.awayTeamId]).filter(Boolean).map(String))];
    const named: any[] = tids.length ? await db.collection("teams").find({ teamId: { $in: tids } }, { projection: { teamId: 1, name: 1, displayName: 1 } }).limit(600).toArray() : [];
    const names = new Map(named.map((t) => [String(t.teamId), String(t.displayName || t.name || "")]));
    for (const f of fx) {
      const slot = (f.umpires as any[]).find((u) => idList.includes(String(u?.umpireId)));
      if (!slot || slot.allocationStatus === "declined") continue;
      const start = new Date(String(f.scheduledStart));
      const label = String(slot.umpireType ?? "umpire").replace(/_/g, " ");
      items.push({ uid: `duty-${f.fixtureId}-${memberId}`, title: `${pre}${/^umpire$/i.test(label) ? "Umpiring" : label.charAt(0).toUpperCase() + label.slice(1)}: ${names.get(String(f.homeTeamId)) || "TBC"} v ${names.get(String(f.awayTeamId)) || "TBC"}`, start, end: new Date(start.getTime() + DUTY_MIN * 60_000), location: f.venueName ? String(f.venueName) : undefined, description: [f.round ? `Round ${f.round}` : "", slot.allocationStatus === "assigned" ? "Awaiting your reply" : ""].filter(Boolean).join(" · "), url: link("/admin/my-duties"), status: statusOf(f.status), alarmMinutes: 90 });
    }
  }

  if (inc.shifts) {
    const signups: any[] = await db.collection("volunteer_signups").find({ memberId, status: { $in: ["confirmed", "swap_requested"] } }, { projection: { shiftId: 1 } }).limit(300).toArray();
    const shifts: any[] = signups.length ? await db.collection("volunteer_shifts").find({ shiftId: { $in: signups.map((s) => String(s.shiftId)) }, date: { $gte: from.toISOString().slice(0, 10), $lte: to.toISOString().slice(0, 10) } }, { projection: { shiftId: 1, date: 1, startTime: 1, endTime: 1, label: 1, location: 1, notes: 1, status: 1, clubName: 1 } }).limit(300).toArray() : [];
    for (const s of shifts) items.push({ uid: `shift-${s.shiftId}-${memberId}`, title: `${pre}${s.label || "Volunteer shift"}${s.clubName ? ` (${s.clubName})` : ""}`, start: brisbaneTime(String(s.date), String(s.startTime)), end: brisbaneTime(String(s.date), String(s.endTime)), location: s.location ? String(s.location) : undefined, description: s.notes ? String(s.notes) : undefined, url: link("/admin/my-shifts"), status: statusOf(s.status), alarmMinutes: 60 });
  }

  if (inc.events) {
    const clubRef = String(member.membership?.clubId ?? member.clubId ?? ""), assocId = String(member.membership?.associationId ?? member.associationId ?? "");
    const or: Record<string, unknown>[] = [{ scope: { $in: ["national", "international"] } }];
    if (clubRef) or.push({ "organization.id": clubRef }, { "references.clubId": clubRef });
    if (assocId) or.push({ "organization.id": assocId }, { "references.associationId": assocId, calendarPropagation: { $in: ["global", "association", "club"] } });
    const events: any[] = await db.collection("events").find({ deleted: { $ne: true }, status: { $in: ["scheduled", "postponed", "cancelled"] }, visibility: { $in: ["public", "members-only"] }, startDate: { $gte: from, $lte: to }, $or: or }, { projection: { id: 1, title: 1, startDate: 1, endDate: 1, location: 1, status: 1, description: 1 } }).limit(300).toArray();
    for (const e of events) {
      const start = new Date(e.startDate), end = e.endDate ? new Date(e.endDate) : new Date(start.getTime() + 2 * 3600_000);
      const place = typeof e.location === "string" ? e.location : e.location?.name ?? e.location?.venue;
      items.push({ uid: `event-${e.id ?? e._id ?? e.title}`, title: String(e.title ?? "Event"), start, end, location: place ? String(place) : undefined, description: typeof e.description === "string" ? e.description.slice(0, 500) : undefined, url: link("/events"), status: statusOf(e.status) });
    }
  }

  return items.sort((a, b) => a.start.getTime() - b.start.getTime());
}
