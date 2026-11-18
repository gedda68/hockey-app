import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/access/guardians", () => ({
  guardianIdsFor: async (_db: unknown, m: { memberId: string }) => (m.memberId === "kid" ? ["parent"] : []),
  childrenOf: async (_db: unknown, id: string) => (id === "parent" ? [{ memberId: "kid", personalInfo: { firstName: "Sam", lastName: "Lee" } }] : []),
  isMinor: () => false,
}));

import { brisbaneTime, buildCalendar, escapeText, foldLine, tokenFromSegment, utcStamp } from "@/lib/calendar/ics";
import { calendarItems, cleanIncludes, DEFAULT_INCLUDES } from "@/lib/calendar/items";
import { createFeed, listFeeds, renderFeed, revokeFeed, rotateFeed, setIncludes, subjectsFor } from "@/lib/calendar/service";
import { writableDb, type Doc } from "../helpers/writableDb";

const NOW = new Date("2026-05-10T02:00:00Z");

describe("ics format", () => {
  it("escapes text, folds long lines without breaking characters, and stamps UTC", () => {
    expect(escapeText("a,b;c\\d\ne")).toBe("a\\,b\;c\\\\d\\ne");
    const long = "SUMMARY:" + "é".repeat(80);
    const folded = foldLine(long).split("\r\n");
    expect(folded.length).toBeGreaterThan(1);
    for (const l of folded) expect(new TextEncoder().encode(l).length).toBeLessThanOrEqual(75);
    expect(folded.slice(1).every((l) => l.startsWith(" "))).toBe(true);
    expect(folded.map((l, i) => (i ? l.slice(1) : l)).join("")).toBe(long);
    expect(utcStamp(new Date("2026-05-10T02:03:04.567Z"))).toBe("20260510T020304Z");
    expect(brisbaneTime("2026-05-10", "09:30").toISOString()).toBe("2026-05-09T23:30:00.000Z");
  });
  it("builds a calendar with events, statuses, reminders and CRLF line ends", () => {
    const ics = buildCalendar({ name: "Sam's hockey", now: NOW, items: [
      { uid: "m1", title: "U14 v Rivals", start: new Date("2026-05-16T00:00:00Z"), end: new Date("2026-05-16T01:30:00Z"), location: "Field 2, Chermside", description: "Round 5", status: "CONFIRMED", alarmMinutes: 60 },
      { uid: "m2", title: "U14 v Eagles", start: new Date("2026-05-23T00:00:00Z"), end: new Date("2026-05-23T01:30:00Z"), status: "CANCELLED", alarmMinutes: 60 },
      { uid: "bad", title: "No date", start: new Date("nope"), end: new Date("nope") },
    ] });
    expect(ics.startsWith("BEGIN:VCALENDAR\r\nVERSION:2.0\r\n")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(ics.split("BEGIN:VEVENT").length - 1).toBe(2);
    expect(ics).toContain("UID:m1@hockey-app");
    expect(ics).toContain("DTSTART:20260516T000000Z");
    expect(ics).toContain("LOCATION:Field 2\\, Chermside");
    expect(ics).toContain("SUMMARY:Cancelled: U14 v Eagles");
    expect(ics).toContain("STATUS:CANCELLED");
    expect(ics.match(/BEGIN:VALARM/g)).toHaveLength(1); // none for a cancelled game
    expect(ics).toContain("TRIGGER:-PT60M");
    expect(ics).toContain("REFRESH-INTERVAL;VALUE=DURATION:PT6H");
    expect(/(?<!\r)\n/.test(ics)).toBe(false);
  });
  it("only accepts real-looking tokens, with or without .ics", () => {
    expect(tokenFromSegment("abcdefghijklmnopqrstuv.ics")).toBe("abcdefghijklmnopqrstuv");
    expect(tokenFromSegment("short")).toBeNull();
    expect(tokenFromSegment("abcdefghijklmnopqrstuv/../x")).toBeNull();
  });
});

const data = (): Record<string, Doc[]> => ({
  members: [
    { memberId: "me", personalInfo: { firstName: "Alex", lastName: "Kim" } },
    { memberId: "parent", personalInfo: { firstName: "Pat", lastName: "Lee" } },
    { memberId: "kid", personalInfo: { firstName: "Sam", lastName: "Lee" }, clubId: "chc" },
    { memberId: "stranger", personalInfo: { firstName: "Zed" } },
  ],
  teams: [
    { teamId: "T1", clubId: "chc", name: "Hawks U14", roster: [{ memberId: "kid", roleId: "player", status: "active" }, { memberId: "me", roleId: "coach", status: "active" }] },
    { teamId: "T2", clubId: "x", name: "Rivals", roster: [] },
  ],
  league_fixtures: [
    { fixtureId: "F1", homeTeamId: "T1", awayTeamId: "T2", scheduledStart: "2026-05-16T00:00:00.000Z", venueName: "Field 2", round: 5, status: "scheduled" },
    { fixtureId: "F2", homeTeamId: "T2", awayTeamId: "T1", scheduledStart: "2026-05-23T00:00:00.000Z", status: "cancelled" },
    { fixtureId: "F3", homeTeamId: "T2", awayTeamId: "T2", scheduledStart: "2026-05-30T00:00:00.000Z" },
    { fixtureId: "OLD", homeTeamId: "T1", awayTeamId: "T2", scheduledStart: "2025-01-01T00:00:00.000Z" },
  ],
  training_sessions: [
    { sessionId: "S1", clubId: "chc", teamId: null, title: "Club training", startAt: "2026-05-12T08:00:00.000Z", endAt: "2026-05-12T09:00:00.000Z", location: "Oval" },
    { sessionId: "S2", clubId: "chc", teamId: "T9", title: "Other team", startAt: "2026-05-12T08:00:00.000Z" },
  ],
  volunteer_signups: [{ signupId: "G1", shiftId: "V1", memberId: "kid", status: "confirmed" }],
  volunteer_shifts: [{ shiftId: "V1", date: "2026-05-17", startTime: "09:00", endTime: "11:30", label: "Canteen", clubName: "Chermside" }],
  association_official_register: [], calendar_feeds: [], events: [],
});

describe("what goes on the calendar", () => {
  it("includes the games and training of the teams someone is on, ordered, with roles and venues", async () => {
    const items = await calendarItems(writableDb(data()), "kid", { includes: DEFAULT_INCLUDES, now: NOW, prefix: "Sam" });
    expect(items.map((i) => i.uid)).toEqual(expect.arrayContaining(["match-F1-T1-kid", "match-F2-T1-kid", "training-S1-kid", "shift-V1-kid"]));
    expect(items.some((i) => i.uid.includes("F3") || i.uid.includes("OLD") || i.uid.includes("S2"))).toBe(false);
    const m = items.find((i) => i.uid === "match-F1-T1-kid")!;
    expect(m).toMatchObject({ title: "Sam: Hawks U14 v Rivals", location: "Field 2", status: "CONFIRMED" });
    expect(m.description).toBe("Round 5 · Playing · Home");
    expect(m.end.getTime() - m.start.getTime()).toBe(90 * 60_000);
    expect(items.find((i) => i.uid === "match-F2-T1-kid")).toMatchObject({ status: "CANCELLED", description: expect.stringContaining("Away") });
    expect(items.find((i) => i.uid === "training-S1-kid")!.end.toISOString()).toBe("2026-05-12T09:00:00.000Z");
    expect(items.find((i) => i.uid === "shift-V1-kid")).toMatchObject({ title: "Sam: Canteen (Chermside)" });
    expect(items.find((i) => i.uid === "shift-V1-kid")!.start.toISOString()).toBe("2026-05-16T23:00:00.000Z");
    expect(items.map((i) => i.start.getTime())).toEqual([...items.map((i) => i.start.getTime())].sort((a, b) => a - b));
  });
  it("leaves out what was switched off", async () => {
    const items = await calendarItems(writableDb(data()), "kid", { includes: cleanIncludes({ matches: false, shifts: false }), now: NOW });
    expect(items.map((i) => i.uid)).toEqual(["training-S1-kid"]);
  });
  it("lists umpiring by umpire number, skipping declined allocations", async () => {
    const t = data();
    t.association_official_register = [{ memberId: "me", umpireNumber: "U-7", isActive: true }];
    t.league_fixtures.push(
      { fixtureId: "U1", homeTeamId: "T1", awayTeamId: "T2", scheduledStart: "2026-06-06T01:00:00.000Z", venueName: "Field 1", umpires: [{ umpireType: "umpire", umpireId: "U-7", allocationStatus: "accepted" }] },
      { fixtureId: "U2", homeTeamId: "T1", awayTeamId: "T2", scheduledStart: "2026-06-13T01:00:00.000Z", umpires: [{ umpireType: "umpire", umpireId: "U-7", allocationStatus: "declined" }] },
      { fixtureId: "U3", homeTeamId: "T1", awayTeamId: "T2", scheduledStart: "2026-06-20T01:00:00.000Z", umpires: [{ umpireType: "technical_official", umpireId: "me" }] },
    );
    const items = await calendarItems(writableDb(t), "me", { includes: { ...DEFAULT_INCLUDES, matches: false, training: false }, now: NOW });
    expect(items.map((i) => i.uid)).toEqual(["duty-U1-me", "duty-U3-me"]);
    expect(items[0]).toMatchObject({ title: "Umpiring: Hawks U14 v Rivals", location: "Field 1" });
    expect(items[1].title).toBe("Technical official: Hawks U14 v Rivals");
  });
  it("shows a coach's games as coaching", async () => {
    const items = await calendarItems(writableDb(data()), "me", { includes: DEFAULT_INCLUDES, now: NOW });
    expect(items.find((i) => i.uid.startsWith("match-F1"))!.description).toContain("Coaching");
  });
});

describe("calendar links", () => {
  it("lets people make links for themselves and their children only", async () => {
    const t = data(), db = writableDb(t);
    expect((await subjectsFor(db, "parent")).map((p) => p.memberId)).toEqual(["parent", "kid"]);
    expect(await createFeed(db, "parent", "kid", undefined, NOW)).toMatchObject({ ok: true });
    expect(await createFeed(db, "stranger", "kid", undefined, NOW)).toMatchObject({ ok: false, status: 403 });
    expect(await createFeed(db, "parent", "me", undefined, NOW)).toMatchObject({ ok: false, status: 403 });
    expect(t.calendar_feeds).toHaveLength(1);
    expect(t.calendar_feeds[0].includes.events).toBe(false); // a child's feed leaves club events to the parent's own
  });
  it("gives back the same link when asked twice, and a new one when replaced", async () => {
    const t = data(), db = writableDb(t);
    const a = await createFeed(db, "me", "me", undefined, NOW), b = await createFeed(db, "me", "me", undefined, NOW);
    if (!a.ok || !b.ok) throw new Error("expected feeds");
    expect(b.feed.token).toBe(a.feed.token);
    expect(a.feed.token).toMatch(/^[A-Za-z0-9_-]{32}$/);
    const c = await rotateFeed(db, "me", "me");
    if (!c.ok) throw new Error("expected rotate");
    expect(c.feed.token).not.toBe(a.feed.token);
    expect(await renderFeed(db, a.feed.token, { now: NOW })).toBeNull();
    expect(await renderFeed(db, c.feed.token + ".ics", { now: NOW })).toContain("BEGIN:VCALENDAR");
    expect(await rotateFeed(db, "stranger", "stranger")).toMatchObject({ ok: false, status: 404 });
  });
  it("serves a child's calendar named for the child, and records that it was read", async () => {
    const t = data(), db = writableDb(t);
    const f = await createFeed(db, "parent", "kid", undefined, NOW);
    if (!f.ok) throw new Error("expected feed");
    const ics = (await renderFeed(db, f.feed.token, { now: NOW, origin: "https://app.test" }))!;
    expect(ics).toContain("X-WR-CALNAME:Sam's hockey");
    expect(ics).toContain("SUMMARY:Sam: Hawks U14 v Rivals");
    expect(ics).toContain("URL:https://app.test/admin/dashboard");
    expect(t.calendar_feeds[0]).toMatchObject({ lastFetchedAt: NOW.toISOString(), fetchCount: 1 });
  });
  it("stops serving when the link is stopped or the parent is no longer the child's guardian", async () => {
    const t = data(), db = writableDb(t);
    const f = await createFeed(db, "parent", "kid", undefined, NOW);
    if (!f.ok) throw new Error("expected feed");
    t.calendar_feeds[0].ownerId = "stranger"; // as if the link between them was removed
    expect(await renderFeed(db, f.feed.token, { now: NOW })).toBeNull();
    t.calendar_feeds[0].ownerId = "parent";
    expect(await renderFeed(db, f.feed.token, { now: NOW })).not.toBeNull();
    expect(await revokeFeed(db, "parent", "kid", NOW)).toEqual({ ok: true });
    expect(await renderFeed(db, f.feed.token, { now: NOW })).toBeNull();
    expect(await listFeeds(db, "parent")).toEqual([]);
  });
  it("changes what's included, and ignores junk", async () => {
    const t = data(), db = writableDb(t);
    await createFeed(db, "me", "me", undefined, NOW);
    const r = await setIncludes(db, "me", "me", { training: false, events: true, bogus: true, matches: "yes" });
    if (!r.ok) throw new Error("expected ok");
    expect(r.feed.includes).toEqual({ matches: true, training: false, duties: true, shifts: true, events: true });
    expect(await renderFeed(db, "tooShort", { now: NOW })).toBeNull();
    expect(await renderFeed(db, "x".repeat(30), { now: NOW })).toBeNull();
  });
});
