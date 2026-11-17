// lib/notifications/cronFilter.ts
// Which members the scheduled job refreshes: only people who have email, SMS or social switched on for something, since
// in-app-only members are brought up to date when they open the app. Pure.

import { CATEGORIES } from "@/lib/notifications/prefs";

export const EXTRA_CHANNELS = ["email", "sms", "social"] as const;

export function membersWithExtraChannelsFilter(): Record<string, unknown> {
  return {
    "notificationPrefs.enabled": { $ne: false },
    $or: CATEGORIES.flatMap((c) => EXTRA_CHANNELS.map((ch) => ({ [`notificationPrefs.categories.${c}.${ch}`]: true }))),
  };
}
