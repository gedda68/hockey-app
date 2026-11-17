// lib/social/compose.ts — turning an announcement or a nomination window into public post text, and cleaning a post
// from the form. Pure. Only things that are safe to be public are composed: a call for nominations (never the people
// nominated or selected) and announcements that aren't aimed at particular teams or ages.

import { APP_TIME_ZONE } from "@/lib/member/availability";
import { isTargeted } from "@/lib/announcements/targeting";

export const MAX_POST = 1500;
export type Cleaned<T> = { ok: true; value: T } | { ok: false; error: string };

const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const dayLabel = (iso: string) => new Date(iso).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "long", timeZone: APP_TIME_ZONE });

export function composeAnnouncementPost(a: { title: string; body: string; targeting?: unknown }): Cleaned<{ text: string }> {
  if (isTargeted(a.targeting as never)) return { ok: false, error: "Announcements aimed at particular teams or ages are private and can't be posted publicly" };
  return { ok: true, value: { text: `${a.title}\n\n${a.body}`.slice(0, MAX_POST) } };
}

export function composeNominationPost(w: { title: string; description?: string; ageGroup?: string; positionTitle?: string; scopeName?: string; openDate: string; closeDate: string; category?: string }, link: string): { text: string; link: string } {
  const what = w.positionTitle || w.ageGroup || "";
  const lines = [
    `Nominations are open: ${w.title}`,
    [what && `For: ${what}`, w.scopeName && `Run by: ${w.scopeName}`].filter(Boolean).join(" · "),
    w.description ? w.description.trim() : "",
    `Nominations close ${dayLabel(w.closeDate)}.`,
    "Sign in to nominate.",
  ].filter(Boolean);
  return { text: lines.join("\n\n").slice(0, MAX_POST), link };
}

export interface SocialPostInput { text: string; link: string | null; postAt: string; accountIds: string[] }

export function cleanSocialPost(body: unknown, now: Date = new Date()): Cleaned<SocialPostInput> {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const text = str(b.text, MAX_POST);
  if (!text) return { ok: false, error: "Write something to post" };
  const accountIds = [...new Set((Array.isArray(b.accountIds) ? b.accountIds : []).map((x) => str(x, 80)).filter(Boolean))].slice(0, 10);
  if (!accountIds.length) return { ok: false, error: "Choose a page to post to" };
  let link: string | null = null;
  if (str(b.link, 300)) {
    link = str(b.link, 300);
    if (!/^https:\/\//i.test(link)) return { ok: false, error: "The link must start with https://" };
  }
  let postAt = now.toISOString();
  if (b.postAt) {
    if (Number.isNaN(Date.parse(String(b.postAt)))) return { ok: false, error: "The post time isn't valid" };
    postAt = new Date(String(b.postAt)).toISOString();
    if (Date.parse(postAt) > now.getTime() + 90 * 86_400_000) return { ok: false, error: "That's too far ahead (90 days at most)" };
  }
  return { ok: true, value: { text, link, postAt, accountIds } };
}
