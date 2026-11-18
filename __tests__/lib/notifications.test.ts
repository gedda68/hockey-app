import { describe, expect, it, vi } from "vitest";
import { allows, applyPrefsPatch, classifyLegacy, defaultPrefs, mergePrefs } from "@/lib/notifications/prefs";
import { approvalCandidates, eventCandidates, eventLevel, matchCandidates, nominationCandidates, type Candidate } from "@/lib/notifications/candidates";
import { storeCandidates } from "@/lib/notifications/engine";
import { SENDERS } from "@/lib/notifications/channels";

const NOW = new Date("2026-11-17T00:00:00Z"); // 10am Tuesday in Brisbane
const iso = (ms: number) => new Date(NOW.getTime() + ms).toISOString();
const H = 3600_000;
const D = 24 * H;

describe("preferences", () => {
  it("default to in-app on and everything else off", () => {
    const p = defaultPrefs();
    expect(p.enabled).toBe(true);
    for (const c of Object.values(p.categories)) expect(c).toEqual({ inApp: true, email: false, sms: false, social: false });
  });

  it("merge stored values over the defaults and drop junk", () => {
    const p = mergePrefs({ enabled: false, levels: { club: false, bogus: true }, categories: { matches: { inApp: false, email: "yes" }, nope: { inApp: false } } });
    expect(p.enabled).toBe(false);
    expect(p.levels).toEqual({ global: true, association: true, club: false, personal: true });
    expect(p.categories.matches).toEqual({ inApp: false, email: false, sms: false, social: false });
    expect(p.categories).not.toHaveProperty("nope");
    expect(mergePrefs(null)).toEqual(defaultPrefs());
  });

  it("a patch changes only what it names", () => {
    const next = applyPrefsPatch(defaultPrefs(), { levels: { global: false }, categories: { events: { sms: true, inApp: "no" } }, enabled: "x" });
    expect(next.levels.global).toBe(false);
    expect(next.levels.club).toBe(true);
    expect(next.categories.events.sms).toBe(true);
    expect(next.categories.events.inApp).toBe(true);
    expect(next.enabled).toBe(true);
  });

  it("allows needs the master switch, the level and the category on that channel", () => {
    const n = { level: "club" as const, category: "matches" as const };
    expect(allows(defaultPrefs(), n)).toBe(true);
    expect(allows(applyPrefsPatch(defaultPrefs(), { enabled: false }), n)).toBe(false);
    expect(allows(applyPrefsPatch(defaultPrefs(), { levels: { club: false } }), n)).toBe(false);
    expect(allows(applyPrefsPatch(defaultPrefs(), { categories: { matches: { inApp: false } } }), n)).toBe(false);
    expect(allows(defaultPrefs(), n, "email")).toBe(false);
  });

  it("older notifications count as club membership reminders", () => {
    expect(classifyLegacy({ type: "renewal_reminder" })).toEqual({ level: "club", category: "membership" });
    expect(classifyLegacy({ level: "personal", category: "approvals" })).toEqual({ level: "personal", category: "approvals" });
    expect(classifyLegacy({ level: "x", category: "y" })).toEqual({ level: "club", category: "membership" });
  });
});

describe("match notifications", () => {
  const names = new Map([["t1", "U12 Girls"], ["t2", "Easts"]]);
  const clubs = new Map([["t1", "c1"]]);
  const fx = (over = {}) => ({ fixtureId: "f1", homeTeamId: "t1", awayTeamId: "t2", scheduledStart: iso(24 * H), venueName: "Main Pitch", round: 3, status: "scheduled", ...over });

  it("announces my team's match in the next three days", () => {
    const [n] = matchCandidates([fx()], new Set(["t1"]), names, clubs, NOW);
    expect(n).toMatchObject({ dedupeKey: "match:f1:t1", level: "club", category: "matches", title: "U12 Girls v Easts", clubId: "c1" });
    expect(n.message).toContain("Main Pitch");
  });

  it("says @ when we're away", () => {
    const [n] = matchCandidates([fx({ homeTeamId: "t2", awayTeamId: "t1" })], new Set(["t1"]), names, clubs, NOW);
    expect(n.title).toBe("U12 Girls @ Easts");
  });

  it("skips matches that are too far off, past, not mine, or not scheduled", () => {
    const list = [fx({ scheduledStart: iso(5 * D) }), fx({ scheduledStart: iso(-H) }), fx({ homeTeamId: "x", awayTeamId: "y" }), fx({ status: "cancelled" }), fx({ scheduledStart: null })];
    expect(matchCandidates(list, new Set(["t1"]), names, clubs, NOW)).toEqual([]);
  });
});

describe("nomination deadline notifications", () => {
  const w = (over = {}) => ({ windowId: "w1", title: "U16 Boys", scopeType: "association" as const, scopeName: "BHA", closeDate: "2026-11-20", status: "open", ...over });

  it("warns as the deadline nears and says how long is left", () => {
    expect(nominationCandidates([w()], new Set(), {}, NOW)[0]).toMatchObject({ title: "Nominations closes in 3 days: U16 Boys", level: "association", category: "nominations", dedupeKey: "nomination:w1:soon" });
    expect(nominationCandidates([w({ closeDate: "2026-11-18" })], new Set(), {}, NOW)[0]).toMatchObject({ dedupeKey: "nomination:w1:final" });
    expect(nominationCandidates([w({ closeDate: "2026-11-17" })], new Set(), {}, NOW)[0].title).toContain("closes today");
  });

  it("is a club notification for club windows", () => {
    expect(nominationCandidates([w({ scopeType: "club" })], new Set(), {}, NOW)[0].level).toBe("club");
  });

  it("ignores windows already nominated for, far off, closed or past", () => {
    expect(nominationCandidates([w()], new Set(["w1"]), {}, NOW)).toEqual([]);
    expect(nominationCandidates([w({ closeDate: "2026-12-30" })], new Set(), {}, NOW)).toEqual([]);
    expect(nominationCandidates([w({ closeDate: "2026-11-16" })], new Set(), {}, NOW)).toEqual([]);
    expect(nominationCandidates([w({ status: "closed" })], new Set(), {}, NOW)).toEqual([]);
  });

  it("skips people outside the age or gender rule", () => {
    const rule = w({ minBirthYear: 2010, maxBirthYear: 2012, gender: "female" });
    expect(nominationCandidates([rule], new Set(), { birthYear: 2011, gender: "Female" }, NOW)).toHaveLength(1);
    expect(nominationCandidates([rule], new Set(), { birthYear: 2005, gender: "Female" }, NOW)).toEqual([]);
    expect(nominationCandidates([rule], new Set(), { birthYear: 2011, gender: "Male" }, NOW)).toEqual([]);
    expect(nominationCandidates([rule], new Set(), { birthYear: 2011 }, NOW)).toHaveLength(1);
  });
});

describe("event notifications", () => {
  const ev = (over = {}) => ({ id: "e1", title: "Presentation night", startDate: iso(2 * D), scope: "city", organization: { type: "club", name: "CHC" }, status: "scheduled", ...over });

  it("sets the level from who runs it", () => {
    expect(eventLevel(ev())).toBe("club");
    expect(eventLevel(ev({ organization: { type: "association" } }))).toBe("association");
    expect(eventLevel(ev({ scope: "national" }))).toBe("global");
    expect(eventLevel(ev({ scope: "international", organization: { type: "club" } }))).toBe("global");
  });

  it("covers the next seven days only", () => {
    const list = eventCandidates([ev(), ev({ id: "late", startDate: iso(9 * D) }), ev({ id: "past", startDate: iso(-D) }), ev({ id: "x", status: "cancelled" })], NOW);
    expect(list.map((n) => n.dedupeKey)).toEqual(["event:e1"]);
    expect(list[0]).toMatchObject({ category: "events", level: "club" });
  });

  it("stays until it has finished", () => {
    const [n] = eventCandidates([ev({ endDate: iso(3 * D) })], NOW);
    expect(Date.parse(n.expiresAt)).toBeGreaterThan(NOW.getTime() + 3 * D);
  });
});

describe("things waiting on me", () => {
  it("are personal approvals with their own keys", () => {
    const list = approvalCandidates(
      { invites: [{ appointmentId: "a1", roleName: "Head Coach", sentByName: "Pat" }], guardianAppointments: [{ appointmentId: "a2", memberName: "Sam", roleName: "Scorer" }], guardianRequests: [{ requestId: "r1", memberName: "Sam", requestedRole: "umpire" }] },
      NOW,
    );
    expect(list.map((n) => n.dedupeKey)).toEqual(["invite:a1", "guardian-appt:a2", "guardian-req:r1"]);
    expect(list.every((n) => n.level === "personal" && n.category === "approvals")).toBe(true);
    expect(list[1].link).toBe("/admin/guardian-approvals");
  });
});

describe("storing notifications", () => {
  const cand = (key: string, level: Candidate["level"] = "club", category: Candidate["category"] = "matches"): Candidate => ({ dedupeKey: key, level, category, type: "t", title: key, message: "", link: "/x", eventAt: iso(H), expiresAt: iso(D) });
  const fakeDb = (upserted = true) => {
    const updateOne = vi.fn(async () => ({ upsertedCount: upserted ? 1 : 0 }));
    const updateMany = vi.fn(async () => ({}));
    return { db: { collection: () => ({ updateOne, updateMany }) } as never, updateOne, updateMany };
  };
  const rcpt = { email: "a@b.c", mobile: null };

  it("stores each thing once, keyed by member and dedupe key, without overwriting", async () => {
    const { db, updateOne } = fakeDb();
    expect(await storeCandidates(db, "m1", [cand("a")], rcpt, defaultPrefs(), NOW)).toBe(1);
    const [filter, update, opts] = updateOne.mock.calls[0] as unknown as [Record<string, unknown>, Record<string, any>, Record<string, unknown>];
    expect(filter).toEqual({ memberId: "m1", dedupeKey: "a" });
    expect(Object.keys(update)).toEqual(["$setOnInsert"]);
    expect(update.$setOnInsert).toMatchObject({ memberId: "m1", readAt: null, dismissedAt: null, level: "club", category: "matches" });
    expect(opts).toEqual({ upsert: true });
  });

  it("counts only newly created ones", async () => {
    const { db } = fakeDb(false);
    expect(await storeCandidates(db, "m1", [cand("a")], rcpt, defaultPrefs(), NOW)).toBe(0);
  });

  it("leaves out what the person has switched off", async () => {
    const { db, updateOne } = fakeDb();
    const prefs = applyPrefsPatch(defaultPrefs(), { levels: { personal: false }, categories: { matches: { inApp: false } } });
    await storeCandidates(db, "m1", [cand("m"), cand("p", "personal", "approvals"), cand("e", "club", "events")], rcpt, prefs, NOW);
    expect((updateOne.mock.calls as unknown as [{ dedupeKey: string }][]).map((c) => c[0].dedupeKey)).toEqual(["e"]);
    const off = fakeDb();
    expect(await storeCandidates(off.db, "m1", [cand("a")], rcpt, applyPrefsPatch(defaultPrefs(), { enabled: false }), NOW)).toBe(0);
    expect(off.updateOne).not.toHaveBeenCalled();
  });

  it("clears finished invitations and nominations but never touches matches or events", async () => {
    const { db, updateMany } = fakeDb();
    await storeCandidates(db, "m1", [cand("keep", "personal", "approvals")], rcpt, defaultPrefs(), NOW);
    const [filter] = updateMany.mock.calls[0] as unknown as [Record<string, any>];
    expect(filter.category).toEqual({ $in: ["approvals", "nominations", "announcements", "surveys", "availability", "volunteering"] });
    expect(filter.dedupeKey).toEqual({ $nin: ["keep"] });
    expect(filter.memberId).toBe("m1");
  });

  it("sends on extra channels only for new notifications and only when switched on", async () => {
    const send = vi.fn(async () => {});
    SENDERS.email = send;
    try {
      const on = applyPrefsPatch(defaultPrefs(), { categories: { matches: { email: true } } });
      const a = fakeDb(true);
      await storeCandidates(a.db, "m1", [cand("a")], rcpt, on, NOW);
      expect(send).toHaveBeenCalledTimes(1);
      const b = fakeDb(false);
      await storeCandidates(b.db, "m1", [cand("a")], rcpt, on, NOW);
      expect(send).toHaveBeenCalledTimes(1);
      const c = fakeDb(true);
      await storeCandidates(c.db, "m1", [cand("a")], rcpt, defaultPrefs(), NOW);
      expect(send).toHaveBeenCalledTimes(1);
    } finally {
      delete SENDERS.email;
    }
  });

  it("a failing channel never loses the notification", async () => {
    SENDERS.sms = async () => { throw new Error("gateway down"); };
    try {
      const { db } = fakeDb(true);
      const on = applyPrefsPatch(defaultPrefs(), { categories: { matches: { sms: true } } });
      expect(await storeCandidates(db, "m1", [cand("a")], rcpt, on, NOW)).toBe(1);
    } finally {
      delete SENDERS.sms;
    }
  });
});
