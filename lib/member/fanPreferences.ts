/**
 * Logged-in fan / identity preferences (B3).
 * Stored on `members.fanPreferences` (additive field; safe for existing docs).
 */

export const MAX_FOLLOWED_TEAMS = 24;
export const MAX_FAVOURITE_CLUBS = 16;
export const MAX_PUSH_SUBSCRIPTIONS = 3;

export type FanPushSubscription = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  userAgent?: string;
  createdAt: string;
};

export type FanPreferences = {
  /** `teams.teamId` values the member wants fixtures + optional alerts for. */
  followedTeamIds: string[];
  /** `clubs.id` in the member’s association (same parent as primary club). */
  favouriteClubIds: string[];
  /** Epic J1-style email when a followed team’s published fixture time/venue changes (admin triggers notify). */
  notifyFixtureChangesEmail: boolean;
  /** Web Push when fixture time/venue changes (VAPID; see `lib/push/vapidConfig.ts`). */
  notifyFixtureChangesPush: boolean;
  /** Stored push endpoints (managed via `/api/member/push/subscribe`). */
  pushSubscriptions: FanPushSubscription[];
  /** Weekly tips digest email (cron: `/api/cron/weekly-fan-tips`). */
  weeklyTipsEmail: boolean;
  /** In-app tips on match-day surfaces (client-only for now). */
  showMatchDayTips: boolean;
  updatedAt?: string;
};

export function defaultFanPreferences(): FanPreferences {
  return {
    followedTeamIds: [],
    favouriteClubIds: [],
    notifyFixtureChangesEmail: true,
    notifyFixtureChangesPush: false,
    pushSubscriptions: [],
    weeklyTipsEmail: false,
    showMatchDayTips: true,
  };
}

export function normalizeFanPreferences(raw: unknown): FanPreferences {
  const d = defaultFanPreferences();
  if (!raw || typeof raw !== "object") return d;
  const o = raw as Record<string, unknown>;
  const ids = Array.isArray(o.followedTeamIds)
    ? o.followedTeamIds.map((x) => String(x).trim()).filter(Boolean)
    : [];
  const uniq = [...new Set(ids)].slice(0, MAX_FOLLOWED_TEAMS);

  const favRaw = Array.isArray(o.favouriteClubIds)
    ? o.favouriteClubIds.map((x) => String(x).trim()).filter(Boolean)
    : [];
  const favouriteClubIds = [...new Set(favRaw)].slice(0, MAX_FAVOURITE_CLUBS);

  const subsRaw = Array.isArray(o.pushSubscriptions) ? o.pushSubscriptions : [];
  const pushSubscriptions: FanPushSubscription[] = [];
  const seenEp = new Set<string>();
  for (const s of subsRaw) {
    if (!s || typeof s !== "object") continue;
    const r = s as Record<string, unknown>;
    const endpoint = typeof r.endpoint === "string" ? r.endpoint.trim() : "";
    const k = r.keys as Record<string, unknown> | undefined;
    const p256dh = k && typeof k.p256dh === "string" ? k.p256dh.trim() : "";
    const auth = k && typeof k.auth === "string" ? k.auth.trim() : "";
    if (!endpoint || !p256dh || !auth) continue;
    if (seenEp.has(endpoint)) continue;
    seenEp.add(endpoint);
    pushSubscriptions.push({
      endpoint,
      keys: { p256dh, auth },
      userAgent: typeof r.userAgent === "string" ? r.userAgent : undefined,
      createdAt: typeof r.createdAt === "string" ? r.createdAt : new Date().toISOString(),
    });
    if (pushSubscriptions.length >= MAX_PUSH_SUBSCRIPTIONS) break;
  }

  return {
    followedTeamIds: uniq,
    favouriteClubIds,
    notifyFixtureChangesEmail: o.notifyFixtureChangesEmail !== false,
    notifyFixtureChangesPush: o.notifyFixtureChangesPush === true,
    pushSubscriptions,
    weeklyTipsEmail: o.weeklyTipsEmail === true,
    showMatchDayTips: o.showMatchDayTips !== false,
    updatedAt: typeof o.updatedAt === "string" ? o.updatedAt : undefined,
  };
}

export function memberPrimaryEmail(m: Record<string, unknown>): string | null {
  const c = (m.contact ?? {}) as Record<string, unknown>;
  const raw =
    (typeof c.primaryEmail === "string" && c.primaryEmail.trim()) ||
    (typeof c.email === "string" && c.email.trim()) ||
    "";
  return raw ? raw.trim() : null;
}
