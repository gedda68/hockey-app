import { describe, expect, it } from "vitest";
import { cleanAnnouncement, legacyAudiences } from "@/lib/announcements/validate";
import { announcementCandidates, type AnnouncementLike } from "@/lib/notifications/candidates";
import { allows, mergePrefs } from "@/lib/notifications/prefs";

const NOW = new Date("2026-06-01T02:00:00Z");
const ok = { level: "club", scopeId: "club-1", title: "Presentation night", body: "Friday 7pm at the clubhouse." };

describe("cleanAnnouncement", () => {
  it("accepts a club announcement and defaults publish time to now", () => {
    const r = cleanAnnouncement(ok, NOW);
    expect(r.ok && r.value.publishAt).toBe(NOW.toISOString());
    expect(r.ok && r.value.expiresAt).toBeNull();
  });
  it("needs an audience, a scope, a headline and a message", () => {
    expect(cleanAnnouncement({ ...ok, level: "world" }).ok).toBe(false);
    expect(cleanAnnouncement({ ...ok, scopeId: "" }).ok).toBe(false);
    expect(cleanAnnouncement({ ...ok, title: " " }).ok).toBe(false);
    expect(cleanAnnouncement({ ...ok, body: "" }).ok).toBe(false);
  });
  it("ignores the scope for global announcements", () => {
    const r = cleanAnnouncement({ ...ok, level: "global", scopeId: "x" });
    expect(r.ok && r.value.scopeId).toBe("");
  });
  it("only allows in-app or https links", () => {
    expect(cleanAnnouncement({ ...ok, link: "/events" }).ok).toBe(true);
    expect(cleanAnnouncement({ ...ok, link: "https://example.com/x" }).ok).toBe(true);
    expect(cleanAnnouncement({ ...ok, link: "javascript:alert(1)" }).ok).toBe(false);
    expect(cleanAnnouncement({ ...ok, link: "//evil.com" }).ok).toBe(false);
    expect(cleanAnnouncement({ ...ok, link: "http://plain.com" }).ok).toBe(false);
  });
  it("rejects an end before the start", () => {
    expect(cleanAnnouncement({ ...ok, publishAt: "2026-07-01T00:00:00Z", expiresAt: "2026-06-01T00:00:00Z" }, NOW).ok).toBe(false);
  });
});

describe("legacyAudiences", () => {
  it("limits who can reach whom", () => {
    expect(legacyAudiences("super-admin")).toContain("global");
    expect(legacyAudiences("association-admin")).not.toContain("global");
    expect(legacyAudiences("club-admin")).toEqual(["club"]);
    expect(legacyAudiences("coach")).toEqual([]);
  });
});

describe("announcementCandidates", () => {
  const a = (over: Partial<AnnouncementLike> = {}): AnnouncementLike => ({ announcementId: "A1", level: "club", scopeId: "club-1", title: "Hi", body: "Body", status: "published", publishAt: "2026-05-31T00:00:00Z", ...over });

  it("turns a live announcement into a notification at its level", () => {
    const [c] = announcementCandidates([a()], NOW);
    expect(c).toMatchObject({ dedupeKey: "announcement:A1", level: "club", category: "announcements", clubId: "club-1" });
  });
  it("skips scheduled, withdrawn and expired ones", () => {
    expect(announcementCandidates([a({ publishAt: "2026-06-02T00:00:00Z" })], NOW)).toHaveLength(0);
    expect(announcementCandidates([a({ status: "withdrawn" })], NOW)).toHaveLength(0);
    expect(announcementCandidates([a({ expiresAt: "2026-05-31T12:00:00Z" })], NOW)).toHaveLength(0);
    expect(announcementCandidates([a({ publishAt: "2026-05-01T00:00:00Z" })], NOW)).toHaveLength(0); // older than 14 days, no end set
  });
  it("shortens long messages", () => {
    const [c] = announcementCandidates([a({ body: "x".repeat(400) })], NOW);
    expect(c.message.length).toBeLessThanOrEqual(160);
  });
  it("can be switched off by the member", () => {
    const [c] = announcementCandidates([a()], NOW);
    const prefs = mergePrefs({ categories: { announcements: { inApp: false } } });
    expect(allows(mergePrefs(null), c)).toBe(true);
    expect(allows(prefs, c)).toBe(false);
  });
});
