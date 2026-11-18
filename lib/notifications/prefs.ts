// lib/notifications/prefs.ts
// What a person wants to be told about, and how. Pure: no database access.
//
// Two switches decide whether a notification is delivered on a channel:
//   - the level it comes from (global, association, club, personal), and
//   - its category (matches, nominations, …) on that channel.
// Plus one master switch. Only the in-app channel is live today; email, SMS and social are stored now so the
// choices people make carry over when those channels are switched on.

export const LEVELS = ["global", "association", "club", "personal"] as const;
export type Level = (typeof LEVELS)[number];

export const CATEGORIES = ["matches", "nominations", "events", "membership", "approvals", "announcements", "surveys", "availability", "volunteering", "fees", "awards"] as const;
export type Category = (typeof CATEGORIES)[number];

export const CHANNELS = ["inApp", "email", "sms", "social"] as const;
export type Channel = (typeof CHANNELS)[number];

/** Channels that deliver today. The rest are shown as "coming soon". */
export const LIVE_CHANNELS: readonly Channel[] = ["inApp"];

export const LEVEL_LABELS: Record<Level, { label: string; hint: string }> = {
  global: { label: "Everyone", hint: "National and international events and news for all members" },
  association: { label: "Association", hint: "From your association and its competitions" },
  club: { label: "Club", hint: "Your club, your teams and your matches" },
  personal: { label: "Personal", hint: "Things waiting on you: invitations and approvals" },
};

export const CATEGORY_LABELS: Record<Category, { label: string; hint: string }> = {
  matches: { label: "Upcoming matches", hint: "Your team's matches in the next few days" },
  nominations: { label: "Nomination deadlines", hint: "Nominations closing soon that you haven't entered" },
  events: { label: "Upcoming events", hint: "Events, clinics, meetings and presentations" },
  membership: { label: "Membership", hint: "Renewals and Blue Card reminders" },
  approvals: { label: "Invitations & approvals", hint: "Role invitations and approvals waiting for you" },
  announcements: { label: "Announcements", hint: "Messages written by your club, association or the national body" },
  surveys: { label: "Surveys", hint: "Questions from your team, club or association that need your answer" },
  availability: { label: "Match availability", hint: "Your coach or manager asking whether you can play" },
  volunteering: { label: "Volunteer shifts", hint: "Canteen, scoring and set-up shifts you're on" },
  fees: { label: "Fees & payments", hint: "Fees or payment plan instalments that are overdue" },
  awards: { label: "Awards & voting", hint: "Player-of-the-match votes, award nominations and winners" },
};

export const CHANNEL_LABELS: Record<Channel, string> = { inApp: "In the app", email: "Email", sms: "SMS", social: "WhatsApp" };

export interface NotificationPrefs {
  /** Master switch: off silences everything. */
  enabled: boolean;
  levels: Record<Level, boolean>;
  categories: Record<Category, Record<Channel, boolean>>;
}

export function defaultPrefs(): NotificationPrefs {
  return {
    enabled: true,
    levels: { global: true, association: true, club: true, personal: true },
    categories: Object.fromEntries(
      CATEGORIES.map((c) => [c, { inApp: true, email: false, sms: false, social: false }]),
    ) as NotificationPrefs["categories"],
  };
}

const bool = (v: unknown, fallback: boolean) => (typeof v === "boolean" ? v : fallback);

/** Stored preferences laid over the defaults; unknown keys are dropped and anything missing falls back. */
export function mergePrefs(stored: unknown): NotificationPrefs {
  const base = defaultPrefs();
  const s = (stored && typeof stored === "object" ? stored : {}) as Record<string, any>;
  base.enabled = bool(s.enabled, base.enabled);
  for (const l of LEVELS) base.levels[l] = bool(s.levels?.[l], base.levels[l]);
  for (const c of CATEGORIES) for (const ch of CHANNELS) base.categories[c][ch] = bool(s.categories?.[c]?.[ch], base.categories[c][ch]);
  return base;
}

/** A patch from the client applied to the current preferences. Only known switches with true/false values count. */
export function applyPrefsPatch(current: NotificationPrefs, patch: unknown): NotificationPrefs {
  const p = (patch && typeof patch === "object" ? patch : {}) as Record<string, any>;
  const next = mergePrefs(current);
  if (typeof p.enabled === "boolean") next.enabled = p.enabled;
  for (const l of LEVELS) if (typeof p.levels?.[l] === "boolean") next.levels[l] = p.levels[l];
  for (const c of CATEGORIES) for (const ch of CHANNELS) if (typeof p.categories?.[c]?.[ch] === "boolean") next.categories[c][ch] = p.categories[c][ch];
  return next;
}

/** Whether a notification from this level and category may be delivered on this channel. */
export function allows(prefs: NotificationPrefs, n: { level: Level; category: Category }, channel: Channel = "inApp"): boolean {
  return prefs.enabled && prefs.levels[n.level] && prefs.categories[n.category][channel];
}

/** Notifications saved before levels/categories existed (renewal and Blue Card reminders). */
export function classifyLegacy(doc: { level?: string; category?: string; type?: string }): { level: Level; category: Category } {
  const level = (LEVELS as readonly string[]).includes(doc.level ?? "") ? (doc.level as Level) : "club";
  const category = (CATEGORIES as readonly string[]).includes(doc.category ?? "") ? (doc.category as Category) : "membership";
  return { level, category };
}
