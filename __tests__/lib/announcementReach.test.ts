import { describe, expect, it, vi } from "vitest";
import { estimateReach, type ReachMember } from "@/lib/announcements/reach";
import { logDelivery, pruneDeliveries, tally } from "@/lib/notifications/deliveryLog";
import { dispatchExtraChannels, SENDERS } from "@/lib/notifications/channels";
import { applyPrefsPatch, defaultPrefs } from "@/lib/notifications/prefs";

const NOW = new Date("2026-06-01T00:00:00Z");
const m = (id: string, dob: string, prefs?: unknown, guardianIds?: string[]): ReachMember => ({ memberId: id, dateOfBirth: dob, prefs, guardianIds });

describe("estimateReach", () => {
  const scope = [m("A", "1990-01-01"), m("K1", "2016-01-01", undefined, ["P"]), m("K2", "2010-01-01"), m("P", "1985-01-01")];

  it("counts the whole audience when not targeted", () => {
    expect(estimateReach({ level: "club", scope, now: NOW }).total).toBe(4);
  });
  it("narrows by team and adds guardians of matching juniors", () => {
    const r = estimateReach({ level: "club", scope, rosterIds: new Set(["K1", "A"]), targeting: { teamIds: ["T"], includeGuardians: true }, now: NOW });
    expect(r.total).toBe(3); // A, K1 and K1's guardian P
    expect(estimateReach({ level: "club", scope, rosterIds: new Set(["K1"]), targeting: { teamIds: ["T"], includeGuardians: false }, now: NOW }).total).toBe(1);
  });
  it("narrows by age", () => {
    expect(estimateReach({ level: "club", scope, targeting: { maxAge: 12, includeGuardians: false }, now: NOW }).total).toBe(1); // only K1 is 12 or under
    expect(estimateReach({ level: "club", scope, targeting: { maxAge: 12 }, now: NOW }).total).toBe(2); // K1 plus guardian P
  });
  it("finds guardians outside the audience", () => {
    const r = estimateReach({ level: "club", scope: [m("K", "2016-01-01", undefined, ["OUT"])], others: new Map([["OUT", m("OUT", "1980-01-01")]]), targeting: { maxAge: 12 }, now: NOW });
    expect(r.total).toBe(2);
  });
  it("counts channels people have switched on, and those who silenced announcements", () => {
    const email = applyPrefsPatch(defaultPrefs(), { categories: { announcements: { email: true } } });
    const off = applyPrefsPatch(defaultPrefs(), { categories: { announcements: { inApp: false } } });
    const r = estimateReach({ level: "club", scope: [m("A", "1990-01-01", email), m("B", "1990-01-01", off), m("C", "1990-01-01")], now: NOW });
    expect(r.byChannel).toEqual({ inApp: 2, email: 1, sms: 0, social: 0 });
    expect(r.silenced).toBe(1);
  });
  it("respects a level switched off", () => {
    const noClub = applyPrefsPatch(defaultPrefs(), { levels: { club: false } });
    expect(estimateReach({ level: "club", scope: [m("A", "1990-01-01", noClub)], now: NOW }).silenced).toBe(1);
  });
});

describe("delivery log", () => {
  const row = (memberId: string, channel: any, status: any, at: string) => ({ memberId, channel, status, at });
  it("counts a person once per channel, latest attempt wins", () => {
    const t = tally([row("a", "email", "failed", "2026-01-01"), row("a", "email", "sent", "2026-01-02"), row("b", "email", "failed", "2026-01-01"), row("a", "sms", "sent", "2026-01-01")]);
    expect(t.email).toEqual({ sent: 1, failed: 1 });
    expect(t.sms).toEqual({ sent: 1, failed: 0 });
  });
  it("never throws when the write fails", async () => {
    const db = { collection: () => ({ insertOne: async () => { throw new Error("db down"); } }) } as never;
    await expect(logDelivery(db, { memberId: "m", dedupeKey: "k", channel: "email", status: "sent", category: "matches", level: "club" })).resolves.toBeUndefined();
  });
  it("prunes old rows", async () => {
    const deleteMany = vi.fn(async () => ({ deletedCount: 4 }));
    const n = await pruneDeliveries({ collection: () => ({ deleteMany }) } as never, NOW);
    expect(n).toBe(4);
    expect((deleteMany.mock.calls[0] as unknown as [{ at: { $lt: string } }])[0].at.$lt.slice(0, 10)).toBe("2026-03-03");
  });
  it("records sent and failed channel deliveries", async () => {
    const insertOne = vi.fn(async () => ({}));
    const db = { collection: () => ({ insertOne }) } as never;
    SENDERS.email = async () => {};
    SENDERS.sms = async () => { throw new Error("gateway down"); };
    try {
      const prefs = applyPrefsPatch(defaultPrefs(), { categories: { announcements: { email: true, sms: true } } });
      const n = { dedupeKey: "announcement:A1", level: "club", category: "announcements", type: "t", title: "T", message: "M", link: "/", eventAt: "", expiresAt: "", clubId: "c" } as never;
      await dispatchExtraChannels(db, n, { memberId: "m1", email: "a@b.c", mobile: "0412345678" }, prefs);
      const rows = insertOne.mock.calls.map((c) => (c as unknown as [Record<string, string>])[0]);
      expect(rows).toContainEqual(expect.objectContaining({ channel: "email", status: "sent", memberId: "m1", dedupeKey: "announcement:A1" }));
      expect(rows).toContainEqual(expect.objectContaining({ channel: "sms", status: "failed", error: "gateway down" }));
    } finally { delete SENDERS.email; delete SENDERS.sms; }
  });
});
