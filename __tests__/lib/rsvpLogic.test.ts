import { describe, it, expect } from "vitest";
import { cleanRsvp, dueReminder, isQuietHour, matchStartMs, summarise } from "@/lib/rsvp/logic";

const base = { title: "Round 5 v Brothers", matchDate: "2026-12-05", squadSize: 16 };

describe("cleanRsvp", () => {
  it("accepts a good request and trims", () => {
    const r = cleanRsvp({ ...base, title: "  Round 5 v Brothers ", venue: " Oakes Oval " }, "2026-11-18");
    expect(r.ok && r.value.title).toBe("Round 5 v Brothers");
    expect(r.ok && r.value.venue).toBe("Oakes Oval");
  });
  it("needs a title and a real, future date", () => {
    expect(cleanRsvp({ ...base, title: " " }, "2026-11-18").ok).toBe(false);
    expect(cleanRsvp({ ...base, matchDate: "2026-02-30" }, "2026-11-18").ok).toBe(false);
    expect(cleanRsvp({ ...base, matchDate: "2026-11-01" }, "2026-11-18").ok).toBe(false);
    expect(cleanRsvp({ ...base, matchDate: "2026-11-18" }, "2026-11-18").ok).toBe(true);
  });
  it("squad size is optional but sensible", () => {
    expect(cleanRsvp({ ...base, squadSize: "" }, "2026-11-18")).toMatchObject({ ok: true, value: { squadSize: null } });
    expect(cleanRsvp({ ...base, squadSize: 0 }, "2026-11-18").ok).toBe(false);
    expect(cleanRsvp({ ...base, squadSize: 99 }, "2026-11-18").ok).toBe(false);
  });
});

describe("reminders", () => {
  // Request made Mon 30 Nov 2026 10:00 Brisbane; match Sat 5 Dec 14:00 Brisbane.
  const created = "2026-11-30T00:00:00.000Z";
  const req = { status: "open", createdAt: created, matchDate: "2026-12-05", startsAt: "2026-12-05T04:00:00.000Z" };
  const pending = { status: "pending", remindersSent: 0 };
  const at = (iso: string) => new Date(iso);

  it("nothing in the first day, first reminder after it", () => {
    expect(dueReminder(req, pending, at("2026-11-30T20:00:00Z"))).toBeNull(); // 20h after, and 06:00 local
    expect(dueReminder(req, pending, at("2026-11-30T23:00:00Z"))).toBeNull(); // 23h after: not yet a day
  });
  it("first reminder once a day has passed and it's daytime", () => {
    expect(dueReminder(req, pending, at("2026-12-01T01:00:00Z"))).toBe(1); // Tue 11:00 local, 25h after
  });
  it("second reminder about a day and a half before, at least 12h after the first", () => {
    const one = { status: "pending", remindersSent: 1, lastRemindedAt: "2026-12-01T01:00:00.000Z" };
    expect(dueReminder(req, one, at("2026-12-03T10:00:00Z"))).toBeNull(); // Thu 20:00 local, 42h before: too early
    expect(dueReminder(req, one, at("2026-12-04T01:00:00Z"))).toBe(2); // Fri 11:00 local, 27h before
  });
  it("never after two, after answering, once closed, or after the match starts", () => {
    expect(dueReminder(req, { status: "pending", remindersSent: 2 }, at("2026-12-04T01:00:00Z"))).toBeNull();
    expect(dueReminder(req, { status: "answered", remindersSent: 0 }, at("2026-12-04T01:00:00Z"))).toBeNull();
    expect(dueReminder({ ...req, status: "closed" }, pending, at("2026-12-04T01:00:00Z"))).toBeNull();
    expect(dueReminder(req, pending, at("2026-12-05T05:00:00Z"))).toBeNull();
  });
  it("a short-notice request gets its first reminder sooner", () => {
    const soon = { status: "open", createdAt: "2026-12-04T00:00:00.000Z", matchDate: "2026-12-05", startsAt: "2026-12-05T04:00:00.000Z" };
    expect(dueReminder(soon, pending, at("2026-12-04T05:00:00Z"))).toBeNull(); // 5h after: under a third of the 28h window
    expect(dueReminder(soon, pending, at("2026-12-04T10:00:00Z"))).toBe(1); // 20:00 local, 10h after: past a third
  });
  it("quiet hours are 9pm to 7am Brisbane", () => {
    expect(isQuietHour(at("2026-12-01T11:00:00Z"))).toBe(true); // 21:00
    expect(isQuietHour(at("2026-12-01T20:59:00Z"))).toBe(true); // 06:59
    expect(isQuietHour(at("2026-12-01T21:00:00Z"))).toBe(false); // 07:00
    expect(isQuietHour(at("2026-12-01T10:59:00Z"))).toBe(false); // 20:59
  });
  it("a request without a start time uses the start of the match day", () => {
    expect(new Date(matchStartMs({ matchDate: "2026-12-05" })).toISOString()).toBe("2026-12-04T14:00:00.000Z");
  });
});

describe("summarise", () => {
  const row = (id: string, name: string, answer?: "in" | "out" | "maybe") => ({ inviteId: id, memberId: id, name, answer, status: answer ? "answered" : "pending", remindersSent: 0 });
  it("groups answers, treats an unanswered away player as away, and counts who's still needed", () => {
    const s = summarise([row("a", "Zed", "in"), row("b", "Amy", "in"), row("c", "Cal", "out"), row("d", "Dee"), row("e", "Eve"), row("f", "Fay", "maybe")], 4, new Set(["e"]));
    expect(s.counts).toEqual({ in: 2, maybe: 1, out: 1, away: 1, noReply: 1 });
    expect(s.buckets.in.map((r) => r.name)).toEqual(["Amy", "Zed"]);
    expect(s.needed).toBe(2);
    expect(s.total).toBe(6);
  });
  it("an answer beats being marked away; needed is null without a squad size and never negative", () => {
    const s = summarise([row("a", "A", "in"), row("b", "B", "in")], null, new Set(["a"]));
    expect(s.counts.away).toBe(0);
    expect(s.needed).toBeNull();
    expect(summarise([row("a", "A", "in"), row("b", "B", "in")], 1, new Set()).needed).toBe(0);
  });
});

import { rsvpCandidates } from "@/lib/rsvp/candidates";
import { buildRsvpEmail } from "@/lib/email/templates/rsvpRequest";

describe("rsvp notification and email", () => {
  const now = new Date("2026-12-01T00:00:00Z");
  const row = { requestId: "R1", inviteId: "I1", title: "Round 5 v Brothers", teamName: "U16 Boys", matchDate: "2026-12-05", startsAt: "2026-12-05T04:00:00.000Z", status: "open", matchStartMs: Date.parse("2026-12-05T04:00:00.000Z") };
  it("notifies once per invite, for a parent by child name, and not once the match has started or the request closed", () => {
    expect(rsvpCandidates([row], now)).toHaveLength(1);
    expect(rsvpCandidates([row], now)[0]).toMatchObject({ dedupeKey: "rsvp:I1", category: "availability", link: "/admin/my-availability" });
    expect(rsvpCandidates([{ ...row, forChild: "Sam" }], now)[0].title).toMatch(/Can Sam play/);
    expect(rsvpCandidates([row], new Date("2026-12-05T05:00:00Z"))).toHaveLength(0);
    expect(rsvpCandidates([{ ...row, status: "closed" }], now)).toHaveLength(0);
  });
  it("the email links to the page, never straight to an answer", () => {
    const m = buildRsvpEmail({ name: "Alex", title: "Round 5", whenText: "Saturday 5 December, 2:00 pm", teamName: "U16 Boys", token: "tok123" });
    expect(m.html).toContain("/rsvp/tok123");
    expect(m.html).not.toMatch(/[?&]r=|answer=/);
    expect(m.subject).toContain("Can you play");
    expect(buildRsvpEmail({ name: "A", title: "t", whenText: "w", teamName: "T", token: "x", forChild: "Sam", reminder: true }).subject).toMatch(/^Reminder: Can Sam play/);
  });
});
