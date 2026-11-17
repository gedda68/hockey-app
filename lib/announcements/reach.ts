// lib/announcements/reach.ts
// How many people an announcement would reach, and on which channels, before it is sent. Pure.

import { ageOn } from "@/lib/members/blueCard";
import { isMinor } from "@/lib/access/guardians";
import { allows, mergePrefs, type Channel, type Level } from "@/lib/notifications/prefs";
import { isTargeted, type Targeting } from "@/lib/announcements/targeting";

export interface ReachMember { memberId: string; dateOfBirth?: unknown; prefs?: unknown; guardianIds?: string[] }

export interface Reach {
  /** People it is aimed at (including guardians when asked). */
  total: number;
  /** Of those, how many will see it in the app, and on each extra channel (only counts people who switched it on). */
  byChannel: Record<Channel, number>;
  /** People who have switched announcements off everywhere. */
  silenced: number;
}

/**
 * `scope` is everyone the announcement's audience covers. `rosterIds` is who is on the targeted teams (when teams are
 * chosen). `others` holds the people outside the scope who might still get it as a guardian, looked up by id.
 */
export function estimateReach(opts: {
  level: Level; targeting?: Partial<Targeting> | null; scope: ReachMember[]; rosterIds?: Set<string>; others?: Map<string, ReachMember>; now?: Date;
}): Reach {
  const now = opts.now ?? new Date();
  const t = opts.targeting && isTargeted(opts.targeting) ? opts.targeting : null;
  const reached = new Map<string, ReachMember>();

  if (!t) {
    for (const m of opts.scope) reached.set(m.memberId, m);
  } else {
    const teamIds = t.teamIds ?? [];
    for (const m of opts.scope) {
      if (teamIds.length && !opts.rosterIds?.has(m.memberId)) continue;
      if (t.maxAge != null) { const age = ageOn(m.dateOfBirth, now); if (age === null || age > t.maxAge) continue; }
      reached.set(m.memberId, m);
      if (t.includeGuardians !== false && isMinor(m.dateOfBirth, now)) {
        for (const g of m.guardianIds ?? []) {
          const gm = opts.others?.get(g) ?? opts.scope.find((x) => x.memberId === g);
          if (gm) reached.set(gm.memberId, gm);
        }
      }
    }
  }

  const byChannel: Record<Channel, number> = { inApp: 0, email: 0, sms: 0, social: 0 };
  let silenced = 0;
  for (const m of reached.values()) {
    const prefs = mergePrefs(m.prefs);
    const n = { level: opts.level, category: "announcements" as const };
    if (!allows(prefs, n, "inApp")) silenced++;
    for (const ch of Object.keys(byChannel) as Channel[]) if (allows(prefs, n, ch)) byChannel[ch]++;
  }
  return { total: reached.size, byChannel, silenced };
}
