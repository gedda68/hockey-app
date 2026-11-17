// lib/health/clubHealth.ts
// Club health and data-quality checks. Pure: give it the club's members, teams and open incidents and it returns
// a list of things to fix, grouped by check. Nothing here touches the database.

import { ageOn, blueCardStatus, requiresBlueCard } from "@/lib/members/blueCard";
import { isMinor } from "@/lib/access/guardians";

type Doc = Record<string, any>;

export type Severity = "high" | "medium" | "low";
export type CheckId =
  | "missing-dob" | "missing-contact" | "missing-emergency" | "minor-no-guardian" | "blue-card"
  | "duplicates" | "expired-membership" | "empty-team" | "team-staff" | "open-incidents";

export interface Issue { check: CheckId; memberId?: string; teamId?: string; name: string; detail: string }
export interface CheckResult { id: CheckId; title: string; severity: Severity; why: string; count: number; issues: Issue[] }
export interface ClubHealth { checkedAt: string; totals: { members: number; activeMembers: number; teams: number }; score: number; checks: CheckResult[] }

const MAX_LISTED = 50;
const nameOf = (m: Doc) => `${m?.personalInfo?.firstName ?? ""} ${m?.personalInfo?.lastName ?? ""}`.trim() || String(m?.memberId ?? "Unknown");
const isActive = (m: Doc) => /^(active|life)$/i.test(String(m?.membership?.status ?? m?.status ?? "active"));
const blank = (v: unknown) => !String(v ?? "").trim();
const hasGuardian = (m: Doc) =>
  (Array.isArray(m?.personalInfo?.relatedMembers) && m.personalInfo.relatedMembers.some((r: Doc) => r?.memberId && /parent|guardian|mother|father|mum|dad|carer/i.test(String(r?.relationshipType ?? "")))) ||
  !!String(m?.family?.familyId ?? "").trim();

const COACH_KEYS = new Set(["club:head-coach", "club:assistant-coach"]);
const MANAGER_KEYS = new Set(["club:team-manager"]);
const isLive = (h: Doc, now: Date) => h?.status !== "ended" && h?.status !== "pending" && !(h?.expiresAt && new Date(String(h.expiresAt)) <= now);

/**
 * Who looks after a team: people on its roster in a coach or manager role, and people holding a Head Coach,
 * Assistant Coach or Team Manager role for it. `holdings` are the role holdings (with their holder) at this club.
 */
export function teamStaffing(team: Doc, holdings: Doc[], now: Date): { coach: boolean; manager: boolean } {
  const tid = String(team?.teamId ?? "");
  let coach = false;
  let manager = false;
  for (const r of Array.isArray(team?.roster) ? team.roster : []) {
    const role = String(r?.roleId ?? "");
    if (r?.status && r.status !== "active") continue;
    if (/coach/i.test(role)) coach = true;
    if (/manager/i.test(role)) manager = true;
  }
  for (const h of holdings) {
    if (!isLive(h, now) || !Array.isArray(h.teamIds) || !h.teamIds.map(String).includes(tid)) continue;
    if (COACH_KEYS.has(String(h.roleKey))) coach = true;
    if (MANAGER_KEYS.has(String(h.roleKey))) manager = true;
  }
  return { coach, manager };
}

export function assessClub(input: { members: Doc[]; teams: Doc[]; openIncidents?: number; now?: Date; /** Coach/manager holdings at the club; leave out to skip the staffing check. */ staffHoldings?: Doc[] }): ClubHealth {
  const now = input.now ?? new Date();
  const active = input.members.filter(isActive);
  const buckets: Record<CheckId, Issue[]> = {
    "missing-dob": [], "missing-contact": [], "missing-emergency": [], "minor-no-guardian": [], "blue-card": [],
    duplicates: [], "expired-membership": [], "empty-team": [], "team-staff": [], "open-incidents": [],
  };
  const add = (check: CheckId, m: Doc, detail: string) => buckets[check].push({ check, memberId: String(m.memberId ?? ""), name: nameOf(m), detail });

  for (const m of active) {
    const dob = m?.personalInfo?.dateOfBirth;
    if (ageOn(dob, now) === null) add("missing-dob", m, "No valid date of birth");
    const minor = isMinor(dob, now);
    if (!minor && blank(m?.contact?.primaryEmail) && blank(m?.contact?.mobile) && blank(m?.contact?.phone)) add("missing-contact", m, "No email or phone");
    const ec = Array.isArray(m?.emergencyContacts) ? m.emergencyContacts : [];
    if (!ec.some((c: Doc) => !blank(c?.name) && (!blank(c?.phone) || !blank(c?.mobile)))) add("missing-emergency", m, "No emergency contact with a phone number");
    if (minor && !hasGuardian(m)) add("minor-no-guardian", m, "Under 18 with no linked parent or guardian");
    if (requiresBlueCard(m, now)) {
      const s = blueCardStatus(m.blueCard, now);
      if (!s.ok || s.state === "expiring") add("blue-card", m, s.state === "expiring" ? s.label : `Needs a blue card: ${s.label}`);
    }
    const end = m?.membership?.currentPeriodEnd ? new Date(String(m.membership.currentPeriodEnd)) : null;
    if (end && !Number.isNaN(end.getTime()) && end < now) add("expired-membership", m, `Membership period ended ${end.toLocaleDateString("en-AU")}`);
  }

  // Likely duplicates: same name and date of birth.
  const seen = new Map<string, Doc[]>();
  for (const m of input.members) {
    const dob = String(m?.personalInfo?.dateOfBirth ?? "").slice(0, 10);
    const key = `${nameOf(m).toLowerCase().replace(/\s+/g, " ")}|${dob}`;
    if (!dob || !nameOf(m)) continue;
    seen.set(key, [...(seen.get(key) ?? []), m]);
  }
  for (const group of seen.values()) {
    if (group.length > 1) for (const m of group) add("duplicates", m, `Same name and birth date as ${group.length - 1} other record${group.length === 2 ? "" : "s"}`);
  }

  for (const t of input.teams) {
    const roster = Array.isArray(t?.roster) ? t.roster.filter((r: Doc) => !r?.status || r.status === "active") : [];
    const label = String(t.displayName || t.name || t.teamId);
    if (roster.length === 0) buckets["empty-team"].push({ check: "empty-team", teamId: String(t.teamId ?? ""), name: label, detail: "No active players" });
    else if (input.staffHoldings) {
      const st = teamStaffing(t, input.staffHoldings, now);
      if (!st.coach || !st.manager) buckets["team-staff"].push({ check: "team-staff", teamId: String(t.teamId ?? ""), name: label, detail: !st.coach && !st.manager ? "No coach or manager" : !st.coach ? "No coach" : "No manager" });
    }
  }
  if ((input.openIncidents ?? 0) > 0) buckets["open-incidents"].push({ check: "open-incidents", name: "Incident reports", detail: `${input.openIncidents} still open` });

  const defs: Omit<CheckResult, "count" | "issues">[] = [
    { id: "minor-no-guardian", title: "Juniors without a guardian", severity: "high", why: "A parent or guardian must be linked to approve roles and be reached in an emergency." },
    { id: "blue-card", title: "Blue card problems", severity: "high", why: "People in non-player roles over 15 need a valid blue card." },
    { id: "missing-emergency", title: "No emergency contact", severity: "high", why: "Needed if someone is hurt at training or a match." },
    { id: "open-incidents", title: "Open incident reports", severity: "medium", why: "Reports should be reviewed and closed." },
    { id: "duplicates", title: "Possible duplicate members", severity: "medium", why: "Duplicates split history, fees and appointments across two records." },
    { id: "expired-membership", title: "Memberships past their end date", severity: "medium", why: "Renew them or mark them inactive." },
    { id: "missing-dob", title: "Missing date of birth", severity: "medium", why: "Age groups, eligibility and guardian rules depend on it." },
    { id: "missing-contact", title: "Adults with no contact details", severity: "low", why: "The club can't reach them." },
    { id: "team-staff", title: "Teams without a coach or manager", severity: "medium", why: "Every team needs someone running training and match day." },
    { id: "empty-team", title: "Teams with no players", severity: "low", why: "Archive them or add players." },
  ];
  const checks = defs.map((d) => ({ ...d, count: buckets[d.id].length, issues: buckets[d.id].slice(0, MAX_LISTED) }));

  // 100 when nothing is wrong; each affected record costs a little, weighted by severity, as a share of the club.
  const weight = { high: 3, medium: 2, low: 1 } as const;
  const base = Math.max(active.length, 1);
  const penalty = checks.reduce((n, c) => n + (c.id === "open-incidents" || c.id === "empty-team" || c.id === "team-staff" ? Math.min(c.count, 5) * weight[c.severity] : (c.count / base) * 100 * weight[c.severity] * 0.25), 0);
  return {
    checkedAt: now.toISOString(),
    totals: { members: input.members.length, activeMembers: active.length, teams: input.teams.length },
    score: Math.max(0, Math.round(100 - penalty)),
    checks,
  };
}
