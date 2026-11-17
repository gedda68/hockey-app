import { beforeEach, describe, expect, it, vi } from "vitest";
import { latestFailed, summarize } from "@/lib/notifications/deliveryLog";
import { RESEND_LIMIT, resendFailed } from "@/lib/notifications/resend";
import { SENDERS } from "@/lib/notifications/channels";
import { applyPrefsPatch, defaultPrefs } from "@/lib/notifications/prefs";

const r = (memberId: string, channel: any, status: any, at: string, dedupeKey = "k1", category = "matches") => ({ memberId, channel, status, at, dedupeKey, category });

describe("latestFailed / summarize", () => {
  it("keeps only the latest attempt per person, channel and notification, and only if it failed", () => {
    const rows = [r("a", "email", "failed", "1"), r("a", "email", "sent", "2"), r("b", "email", "failed", "1"), r("b", "sms", "failed", "1"), r("c", "email", "failed", "1", "k2")];
    expect(latestFailed(rows).map((x) => `${x.memberId}${x.channel}${x.dedupeKey}`).sort()).toEqual(["bemailk1", "bsmsk1", "cemailk2"]);
  });
  it("summarises by category and channel", () => {
    const s = summarize([r("a", "email", "sent", "1"), r("b", "email", "failed", "1"), r("a", "inApp", "sent", "1", "k1", "announcements")]);
    expect(s).toEqual([
      { category: "announcements", channel: "inApp", sent: 1, failed: 0 },
      { category: "matches", channel: "email", sent: 1, failed: 1 },
    ]);
  });
});

describe("resendFailed", () => {
  const notif = { memberId: "m1", dedupeKey: "k1", title: "T", message: "M", link: "/", level: "club", category: "matches", clubId: "c" };
  let member: Record<string, unknown> | null;
  let notifDoc: Record<string, unknown> | null;
  let prefs: unknown;
  const inserted: Record<string, unknown>[] = [];
  const db = {
    collection: (n: string) => ({
      findOne: async () => (n === "member_notifications" ? notifDoc : member),
      insertOne: async (d: Record<string, unknown>) => { inserted.push(d); },
    }),
  } as never;
  // loadPrefs reads the member document too
  beforeEach(() => {
    inserted.length = 0;
    notifDoc = notif;
    prefs = applyPrefsPatch(defaultPrefs(), { categories: { matches: { email: true } } });
    member = { memberId: "m1", contact: { primaryEmail: "a@b.c" }, notificationPrefs: prefs };
  });

  it("sends again and logs the outcome", async () => {
    const send = vi.fn(async () => {});
    SENDERS.email = send;
    try {
      const res = await resendFailed(db, [{ memberId: "m1", dedupeKey: "k1", channel: "email" }]);
      expect(res).toMatchObject({ attempted: 1, sent: 1, failed: 0, skipped: 0 });
      expect(send).toHaveBeenCalledWith(expect.objectContaining({ title: "T" }), expect.objectContaining({ email: "a@b.c" }), db);
      expect(inserted[0]).toMatchObject({ channel: "email", status: "sent", memberId: "m1" });
    } finally { delete SENDERS.email; }
  });

  it("logs a repeat failure", async () => {
    SENDERS.email = async () => { throw new Error("bounced"); };
    try {
      const res = await resendFailed(db, [{ memberId: "m1", dedupeKey: "k1", channel: "email" }]);
      expect(res).toMatchObject({ attempted: 1, sent: 0, failed: 1 });
      expect(inserted[0]).toMatchObject({ status: "failed", error: "bounced" });
    } finally { delete SENDERS.email; }
  });

  it("skips people who switched the channel off, missing records, and unconfigured channels", async () => {
    SENDERS.email = vi.fn(async () => {});
    try {
      member = { ...member, notificationPrefs: defaultPrefs() };
      expect((await resendFailed(db, [{ memberId: "m1", dedupeKey: "k1", channel: "email" }])).skipped).toBe(1);
      notifDoc = null;
      expect((await resendFailed(db, [{ memberId: "m1", dedupeKey: "k1", channel: "email" }])).skipped).toBe(1);
      expect((await resendFailed(db, [{ memberId: "m1", dedupeKey: "k1", channel: "sms" }])).skipped).toBe(1);
    } finally { delete SENDERS.email; }
  });

  it("caps one call", async () => {
    const many = Array.from({ length: RESEND_LIMIT + 5 }, (_, i) => ({ memberId: `m${i}`, dedupeKey: "k", channel: "sms" as const }));
    const res = await resendFailed(db, many);
    expect(res.capped).toBe(true);
    expect(res.skipped).toBe(RESEND_LIMIT);
  });
});
