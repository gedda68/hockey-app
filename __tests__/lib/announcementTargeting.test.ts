import { describe, expect, it } from "vitest";
import { cleanTargeting, isTargeted, reaches } from "@/lib/announcements/targeting";
import { cleanAnnouncement } from "@/lib/announcements/validate";
import { announcementCandidates, type AnnouncementLike } from "@/lib/notifications/candidates";

const NOW = new Date("2026-06-01T00:00:00Z");
const adult = { teamIds: ["A"], dateOfBirth: "1990-01-01" };
const kid = { teamIds: ["U12"], dateOfBirth: "2016-03-01" }; // age 10

describe("cleanTargeting", () => {
  it("cleans teams and age, defaulting to include guardians", () => {
    expect(cleanTargeting({ teamIds: ["a", "a", " b ", ""], maxAge: "12" })).toEqual({ teamIds: ["a", "b"], includeGuardians: true, maxAge: 12 });
    expect(cleanTargeting({ maxAge: 2 }).maxAge).toBeNull();
    expect(cleanTargeting({ maxAge: 200 }).maxAge).toBeNull();
    expect(cleanTargeting({ includeGuardians: false }).includeGuardians).toBe(false);
    expect(isTargeted(cleanTargeting(null))).toBe(false);
  });
});

describe("reaches", () => {
  it("reaches everyone when not targeted", () => { expect(reaches(null, adult, [], NOW)).toBe(true); });
  it("reaches members of the named teams", () => {
    expect(reaches({ teamIds: ["U12"] }, kid, [], NOW)).toBe(true);
    expect(reaches({ teamIds: ["U12"] }, adult, [], NOW)).toBe(false);
  });
  it("reaches the guardian of a matching child unless guardians are excluded", () => {
    expect(reaches({ teamIds: ["U12"] }, adult, [kid], NOW)).toBe(true);
    expect(reaches({ teamIds: ["U12"], includeGuardians: false }, adult, [kid], NOW)).toBe(false);
  });
  it("applies the age limit, to the person or their child", () => {
    expect(reaches({ maxAge: 12 }, kid, [], NOW)).toBe(true);
    expect(reaches({ maxAge: 12 }, adult, [], NOW)).toBe(false);
    expect(reaches({ maxAge: 12 }, adult, [kid], NOW)).toBe(true);
    expect(reaches({ maxAge: 12 }, { teamIds: [] }, [], NOW)).toBe(false); // unknown age doesn't match
  });
  it("needs team and age to hold for the same person", () => {
    const olderOnTeam = { teamIds: ["U12"], dateOfBirth: "2000-01-01" };
    expect(reaches({ teamIds: ["U12"], maxAge: 12 }, adult, [olderOnTeam, { teamIds: [], dateOfBirth: "2016-01-01" }], NOW)).toBe(false);
  });
});

describe("validation and candidates", () => {
  const ok = { level: "club", scopeId: "c", title: "T", body: "B" };
  it("keeps targeting only when it narrows, and never for global", () => {
    expect(cleanAnnouncement({ ...ok, targeting: {} }).ok && (cleanAnnouncement({ ...ok, targeting: {} }) as any).value.targeting).toBeUndefined();
    const r = cleanAnnouncement({ ...ok, targeting: { maxAge: 12 } });
    expect(r.ok && r.value.targeting?.maxAge).toBe(12);
    const g = cleanAnnouncement({ level: "global", title: "T", body: "B", targeting: { maxAge: 12 } });
    expect(g.ok && g.value.targeting).toBeUndefined();
  });
  it("only notifies people the announcement is aimed at", () => {
    const a: AnnouncementLike = { announcementId: "A", level: "club", scopeId: "c", title: "T", body: "B", status: "published", publishAt: "2026-05-31T00:00:00Z", targeting: { teamIds: ["U12"] } };
    expect(announcementCandidates([a], NOW)).toHaveLength(0); // no info about the member: safe default is not to send
    expect(announcementCandidates([a], NOW, 14, { me: adult, kids: [] })).toHaveLength(0);
    expect(announcementCandidates([a], NOW, 14, { me: adult, kids: [kid] })).toHaveLength(1);
    expect(announcementCandidates([{ ...a, targeting: undefined }], NOW)).toHaveLength(1);
  });
});
