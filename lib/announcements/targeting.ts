// lib/announcements/targeting.ts
// Narrowing an announcement from "the whole club" to particular teams and/or an age limit. Pure.

import { ageOn } from "@/lib/members/blueCard";

export interface Targeting {
  /** Only people on these teams. Empty = no team limit. */
  teamIds: string[];
  /** Also reach the guardians of children who match. */
  includeGuardians: boolean;
  /** Only people this age or younger (for guardians: whose child is). null = no age limit. */
  maxAge: number | null;
}

export const NO_TARGETING: Targeting = { teamIds: [], includeGuardians: true, maxAge: null };

export const isTargeted = (t: Partial<Targeting> | null | undefined) => !!t && ((t.teamIds?.length ?? 0) > 0 || t.maxAge != null);

export function cleanTargeting(raw: unknown): Targeting {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const teamIds = [...new Set((Array.isArray(r.teamIds) ? r.teamIds : []).map((x) => String(x ?? "").trim().slice(0, 80)).filter(Boolean))].slice(0, 30);
  const age = Number(r.maxAge);
  const maxAge = r.maxAge === null || r.maxAge === undefined || r.maxAge === "" || !Number.isFinite(age) || age < 4 || age > 99 ? null : Math.floor(age);
  return { teamIds, includeGuardians: r.includeGuardians !== false, maxAge };
}

export interface Subject { teamIds: string[]; dateOfBirth?: unknown }

const fits = (t: Targeting, s: Subject, now: Date) => {
  if (t.teamIds.length && !s.teamIds.some((id) => t.teamIds.includes(id))) return false;
  if (t.maxAge != null) {
    const age = ageOn(s.dateOfBirth, now);
    if (age === null || age > t.maxAge) return false;
  }
  return true;
};

/** Does this announcement reach this person (or, when allowed, a child they're guardian of)? */
export function reaches(t: Partial<Targeting> | null | undefined, me: Subject, kids: Subject[], now: Date): boolean {
  if (!isTargeted(t)) return true;
  const c = cleanTargeting(t);
  return fits(c, me, now) || (c.includeGuardians && kids.some((k) => fits(c, k, now)));
}
