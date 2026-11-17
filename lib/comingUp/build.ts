// lib/comingUp/build.ts
// What's coming up for a member: matches (playing, coaching, managing), umpiring, training, events, nomination
// deadlines and unread notifications, as one list ordered by when it happens. Pure: the API loads the data.

export type ComingUpKind = "match" | "umpire" | "training" | "event" | "nomination" | "notification";

export interface ComingUpItem {
  id: string;
  kind: ComingUpKind;
  title: string;
  detail: string;
  /** ISO time it happens or is due. */
  at: string;
  link: string;
  /** Small label: Playing, Coaching, Managing, Umpire, Deadline... */
  tag?: string;
}

const COACH_KEYS = new Set(["club:head-coach", "club:assistant-coach"]);
const MANAGER_KEYS = new Set(["club:team-manager"]);
const live = (h: any, now: Date) => h?.status !== "ended" && h?.status !== "pending" && !(h?.expiresAt && new Date(String(h.expiresAt)) <= now);

export type TeamRole = "Playing" | "Coaching" | "Managing";

/** What this member is on a team: from their roster entry and from coach/manager role holdings scoped to the team. */
export function rolesOnTeam(team: any, memberId: string, holdings: any[], now: Date): TeamRole[] {
  const out = new Set<TeamRole>();
  const tid = String(team?.teamId ?? "");
  for (const r of Array.isArray(team?.roster) ? team.roster : []) {
    if (String(r?.memberId) !== memberId || (r?.status && r.status !== "active")) continue;
    const role = String(r?.roleId ?? "");
    if (/coach/i.test(role)) out.add("Coaching");
    else if (/manager/i.test(role)) out.add("Managing");
    else out.add("Playing");
  }
  for (const h of holdings ?? []) {
    if (!live(h, now) || !Array.isArray(h.teamIds) || !h.teamIds.map(String).includes(tid)) continue;
    if (COACH_KEYS.has(String(h.roleKey))) out.add("Coaching");
    if (MANAGER_KEYS.has(String(h.roleKey))) out.add("Managing");
  }
  return [...out];
}

const rank: Record<string, number> = { Coaching: 0, Managing: 1, Playing: 2 };
export const roleTag = (roles: TeamRole[]) => [...roles].sort((a, b) => rank[a] - rank[b]).join(" · ");

export function matchItem(f: { fixtureId: string; homeTeamId?: string; awayTeamId?: string; scheduledStart?: string | null; venueName?: string | null; round?: number }, myTeamIds: Set<string>, names: Map<string, string>, roles: TeamRole[]): ComingUpItem | null {
  if (!f.scheduledStart) return null;
  const home = String(f.homeTeamId ?? ""), away = String(f.awayTeamId ?? "");
  const mine = myTeamIds.has(home) ? home : myTeamIds.has(away) ? away : "";
  if (!mine) return null;
  const opp = mine === home ? away : home;
  return {
    id: `match:${f.fixtureId}:${mine}`,
    kind: "match",
    title: `${names.get(mine) || "Your team"} v ${names.get(opp) || "TBC"}`,
    detail: [f.round ? `Round ${f.round}` : "", f.venueName ?? ""].filter(Boolean).join(" · "),
    at: f.scheduledStart,
    link: "/admin/dashboard",
    tag: roleTag(roles),
  };
}

/** Upcoming first, past dropped, de-duplicated, capped. Notifications keep their own place at the end. */
export function assemble(items: ComingUpItem[], now: Date, limit = 30): { upcoming: ComingUpItem[]; notifications: ComingUpItem[] } {
  const seen = new Set<string>();
  const keep = (i: ComingUpItem) => (seen.has(i.id) ? false : (seen.add(i.id), true));
  const upcoming = items
    .filter((i) => i.kind !== "notification" && Date.parse(i.at) >= now.getTime() - 3600_000)
    .filter(keep)
    .sort((a, b) => a.at.localeCompare(b.at))
    .slice(0, limit);
  const notifications = items.filter((i) => i.kind === "notification").filter(keep).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 5);
  return { upcoming, notifications };
}

/** Which day group an item falls in, in Brisbane time: Today, Tomorrow or the weekday and date. */
export function dayLabel(at: string, now: Date): string {
  const fmt = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "Australia/Brisbane" });
  const day = fmt(new Date(at));
  if (day === fmt(now)) return "Today";
  if (day === fmt(new Date(now.getTime() + 86400000))) return "Tomorrow";
  return new Date(at).toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "short", timeZone: "Australia/Brisbane" });
}
