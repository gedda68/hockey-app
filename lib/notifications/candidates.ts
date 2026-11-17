// lib/notifications/candidates.ts
// Turns what's coming up (matches, nomination deadlines, events, things waiting on you) into notifications.
// Pure: the engine loads the data and stores what comes out.

import { dayInZone } from "@/lib/member/availability";
import type { Category, Level } from "@/lib/notifications/prefs";

export interface Candidate {
  /** Unique per person: the same thing never notifies twice. */
  dedupeKey: string;
  level: Level;
  category: Category;
  type: string;
  title: string;
  message: string;
  link: string;
  /** When the thing happens or is due (used to order the list). */
  eventAt: string;
  expiresAt: string;
  clubId?: string;
}

const HOUR = 3600_000;
const DAY = 24 * HOUR;
const iso = (ms: number) => new Date(ms).toISOString();

const whenText = (at: string) =>
  new Date(at).toLocaleString("en-AU", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Australia/Brisbane" });

/** Whole days from `fromDay` to `toDay` (both YYYY-MM-DD). */
export const daysBetween = (fromDay: string, toDay: string) => Math.round((Date.parse(`${toDay}T00:00:00Z`) - Date.parse(`${fromDay}T00:00:00Z`)) / DAY);

// ── Matches ───────────────────────────────────────────────────────────────────

export interface FixtureLike { fixtureId: string; seasonCompetitionId?: string; homeTeamId?: string; awayTeamId?: string; scheduledStart?: string | null; venueName?: string | null; round?: number; status?: string }

export function matchCandidates(
  fixtures: FixtureLike[],
  myTeamIds: Set<string>,
  teamNames: Map<string, string>,
  clubOfTeam: Map<string, string>,
  now: Date,
  withinHours = 72,
  /** For a child's match shown to their guardian: the child's first name. */
  forChild?: { memberId: string; name: string },
): Candidate[] {
  const out: Candidate[] = [];
  const limit = now.getTime() + withinHours * HOUR;
  for (const f of fixtures) {
    if (!f.scheduledStart || (f.status && f.status !== "scheduled")) continue;
    const t = Date.parse(f.scheduledStart);
    if (Number.isNaN(t) || t < now.getTime() || t > limit) continue;
    const mine = myTeamIds.has(String(f.homeTeamId)) ? String(f.homeTeamId) : myTeamIds.has(String(f.awayTeamId)) ? String(f.awayTeamId) : "";
    if (!mine) continue;
    const home = mine === f.homeTeamId;
    const opp = teamNames.get(String(home ? f.awayTeamId : f.homeTeamId)) ?? "TBC";
    const me = teamNames.get(mine) ?? "Your team";
    out.push({
      dedupeKey: `match:${f.fixtureId}:${mine}${forChild ? `:${forChild.memberId}` : ""}`,
      level: "club",
      category: "matches",
      type: "upcoming_match",
      title: `${forChild ? `${forChild.name}: ` : ""}${me} ${home ? "v" : "@"} ${opp}`,
      message: `${whenText(f.scheduledStart)}${f.venueName ? ` at ${f.venueName}` : ""}${f.round ? ` · Round ${f.round}` : ""}`,
      link: "/admin/my-registration",
      eventAt: f.scheduledStart,
      expiresAt: iso(t + 6 * HOUR),
      clubId: clubOfTeam.get(mine),
    });
  }
  return out;
}

// ── Nomination deadlines ──────────────────────────────────────────────────────

export interface WindowLike {
  windowId: string; title: string; scopeType: "club" | "association"; scopeName?: string; closeDate: string;
  gender?: "open" | "male" | "female"; minBirthYear?: number; maxBirthYear?: number; category?: string; status?: string;
}

export function nominationCandidates(
  windows: WindowLike[],
  nominatedWindowIds: Set<string>,
  person: { birthYear?: number | null; gender?: string | null },
  now: Date,
  withinDays = 7,
): Candidate[] {
  const today = dayInZone(now) as string;
  const out: Candidate[] = [];
  for (const w of windows) {
    if (w.status && w.status !== "open") continue;
    if (nominatedWindowIds.has(w.windowId)) continue;
    // Playing windows with an age or gender rule only matter to people who fit it.
    if (person.birthYear && ((w.minBirthYear && person.birthYear < w.minBirthYear) || (w.maxBirthYear && person.birthYear > w.maxBirthYear))) continue;
    const g = String(person.gender ?? "").toLowerCase();
    if (w.gender && w.gender !== "open" && g && g !== w.gender && !(w.gender === "male" && g === "m") && !(w.gender === "female" && g === "f")) continue;
    const left = daysBetween(today, String(w.closeDate).slice(0, 10));
    if (left < 0 || left > withinDays) continue;
    const when = left === 0 ? "closes today" : left === 1 ? "closes tomorrow" : `closes in ${left} days`;
    out.push({
      dedupeKey: `nomination:${w.windowId}:${left <= 1 ? "final" : "soon"}`,
      level: w.scopeType === "association" ? "association" : "club",
      category: "nominations",
      type: "nomination_due",
      title: `Nominations ${when}: ${w.title}`,
      message: `${w.scopeName ? `${w.scopeName} · ` : ""}You haven't nominated yet.`,
      link: "/admin/nominate",
      eventAt: `${String(w.closeDate).slice(0, 10)}T23:59:00+10:00`,
      expiresAt: iso(Date.parse(`${String(w.closeDate).slice(0, 10)}T00:00:00Z`) + 2 * DAY),
    });
  }
  return out;
}

// ── Events ────────────────────────────────────────────────────────────────────

export interface EventLike {
  id?: string; _id?: unknown; title: string; startDate: string | Date; endDate?: string | Date | null; scope?: string;
  organization?: { type?: string; name?: string }; location?: { name?: string; venue?: string } | string | null; status?: string;
}

/** National and international events go to everyone; association-run events to that association; the rest to the club. */
export function eventLevel(e: EventLike): Level {
  if (e.scope === "national" || e.scope === "international") return "global";
  return e.organization?.type === "association" ? "association" : "club";
}

export function eventCandidates(events: EventLike[], now: Date, withinDays = 7): Candidate[] {
  const out: Candidate[] = [];
  const limit = now.getTime() + withinDays * DAY;
  for (const e of events) {
    if (e.status && !["scheduled", "postponed"].includes(e.status)) continue;
    const start = new Date(e.startDate as string).getTime();
    if (Number.isNaN(start) || start < now.getTime() || start > limit) continue;
    const end = e.endDate ? new Date(e.endDate as string).getTime() : NaN;
    const id = String(e.id ?? e._id ?? e.title);
    const place = typeof e.location === "string" ? e.location : e.location?.name ?? e.location?.venue;
    out.push({
      dedupeKey: `event:${id}`,
      level: eventLevel(e),
      category: "events",
      type: "upcoming_event",
      title: e.title,
      message: `${whenText(iso(start))}${place ? ` · ${place}` : ""}${e.organization?.name ? ` · ${e.organization.name}` : ""}`,
      link: "/events",
      eventAt: iso(start),
      expiresAt: iso(Number.isNaN(end) ? start + DAY : Math.max(end, start) + 2 * HOUR),
    });
  }
  return out;
}

// ── Announcements ─────────────────────────────────────────────────────────────

export interface AnnouncementLike {
  announcementId: string; level: "global" | "association" | "club"; scopeId?: string; title: string; body: string;
  link?: string | null; status?: string; publishAt: string; expiresAt?: string | null; pinned?: boolean;
}

/** Published, not yet expired, and already due (scheduled ones wait). Announcements stay visible for 14 days unless they set an end. */
export function announcementCandidates(rows: AnnouncementLike[], now: Date, keepDays = 14): Candidate[] {
  const out: Candidate[] = [];
  for (const a of rows) {
    if (a.status && a.status !== "published") continue;
    const at = Date.parse(a.publishAt);
    if (Number.isNaN(at) || at > now.getTime()) continue;
    const end = a.expiresAt ? Date.parse(a.expiresAt) : at + keepDays * DAY;
    if (Number.isNaN(end) || end <= now.getTime()) continue;
    out.push({
      dedupeKey: `announcement:${a.announcementId}`,
      level: a.level,
      category: "announcements",
      type: "announcement",
      title: a.title,
      message: a.body.length > 160 ? `${a.body.slice(0, 157)}…` : a.body,
      link: a.link || "/admin/notifications",
      eventAt: iso(at),
      expiresAt: iso(end),
      ...(a.level === "club" && a.scopeId ? { clubId: a.scopeId } : {}),
    });
  }
  return out;
}

// ── Waiting on you ────────────────────────────────────────────────────────────

export interface WaitingOnMe {
  invites: { appointmentId: string; roleName: string; sentByName?: string }[];
  guardianAppointments: { appointmentId: string; memberName?: string; roleName: string }[];
  guardianRequests: { requestId: string; memberName?: string; requestedRole: string }[];
}

export function approvalCandidates(w: WaitingOnMe, now: Date): Candidate[] {
  const at = now.toISOString();
  const exp = iso(now.getTime() + 30 * DAY);
  const base = { level: "personal" as const, category: "approvals" as const, eventAt: at, expiresAt: exp };
  return [
    ...w.invites.map((i) => ({ ...base, dedupeKey: `invite:${i.appointmentId}`, type: "role_invitation", title: `Invitation: ${i.roleName}`, message: `${i.sentByName ? `From ${i.sentByName}. ` : ""}Accept or decline it.`, link: "/admin/my-appointments" })),
    ...w.guardianAppointments.map((i) => ({ ...base, dedupeKey: `guardian-appt:${i.appointmentId}`, type: "guardian_approval", title: `${i.memberName || "Your child"} was invited to ${i.roleName}`, message: "Your approval as parent/guardian is needed.", link: "/admin/guardian-approvals" })),
    ...w.guardianRequests.map((r) => ({ ...base, dedupeKey: `guardian-req:${r.requestId}`, type: "guardian_approval", title: `${r.memberName || "Your child"} asked for ${r.requestedRole}`, message: "Your approval as parent/guardian is needed.", link: "/admin/guardian-approvals" })),
  ];
}
