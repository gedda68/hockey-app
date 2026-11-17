// lib/announcements/validate.ts
// Cleaning an announcement from the form, and who may publish to which audience. Pure.

import { cleanTargeting, isTargeted, type Targeting } from "@/lib/announcements/targeting";

export const AUDIENCES = ["global", "association", "club"] as const;
export type Audience = (typeof AUDIENCES)[number];

export interface AnnouncementInput {
  level: Audience; scopeId: string; title: string; body: string; link: string | null; publishAt: string; expiresAt: string | null;
  /** Only set when it narrows the audience (never for "everyone"). */
  targeting?: Targeting;
}

const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const isDate = (v: unknown) => typeof v === "string" && v !== "" && !Number.isNaN(Date.parse(v));

export type Cleaned<T> = { ok: true; value: T } | { ok: false; error: string };

/** `now` is when the author is submitting; a blank publish time means "now". */
export function cleanAnnouncement(body: unknown, now: Date = new Date()): Cleaned<AnnouncementInput> {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const level = (AUDIENCES as readonly string[]).includes(String(b.level)) ? (String(b.level) as Audience) : null;
  if (!level) return { ok: false, error: "Choose who it's for" };
  const scopeId = level === "global" ? "" : str(b.scopeId, 80);
  if (level !== "global" && !scopeId) return { ok: false, error: level === "club" ? "Choose a club" : "Choose an association" };
  const title = str(b.title, 120);
  if (!title) return { ok: false, error: "Give it a headline" };
  const text = str(b.body, 2000);
  if (!text) return { ok: false, error: "Write the message" };
  let link: string | null = null;
  if (str(b.link, 300)) {
    const l = str(b.link, 300);
    // Only places inside the app, or secure web links.
    if (!(l.startsWith("/") && !l.startsWith("//")) && !/^https:\/\//i.test(l)) return { ok: false, error: "The link must start with / or https://" };
    link = l;
  }
  const publishAt = isDate(b.publishAt) ? new Date(String(b.publishAt)).toISOString() : now.toISOString();
  let expiresAt: string | null = null;
  if (b.expiresAt) {
    if (!isDate(b.expiresAt)) return { ok: false, error: "The end date isn't valid" };
    expiresAt = new Date(String(b.expiresAt)).toISOString();
    if (expiresAt <= publishAt) return { ok: false, error: "It would end before it starts" };
  }
  const targeting = level === "global" ? undefined : cleanTargeting(b.targeting);
  return { ok: true, value: { level, scopeId, title, body: text, link, publishAt, expiresAt, ...(targeting && isTargeted(targeting) ? { targeting } : {}) } };
}

/** Which audiences a login role may write to when the Roles & Access Matrix doesn't apply to them. */
export function legacyAudiences(role: string | undefined): Audience[] {
  if (role === "super-admin") return ["global", "association", "club"];
  if (role === "association-admin") return ["association", "club"];
  if (role === "club-admin" || role === "club-committee") return ["club"];
  return [];
}
