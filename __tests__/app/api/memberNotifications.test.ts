import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  session: { memberId: "m1" } as Record<string, unknown> | null,
  rows: [] as Record<string, unknown>[],
  prefs: null as unknown,
  updateOne: vi.fn(async () => ({ matchedCount: 1 })),
  updateMany: vi.fn(async () => ({})),
  memberUpdate: vi.fn(async () => ({})),
}));
vi.mock("@/lib/auth/session", () => ({ getSession: vi.fn(async () => h.session) }));
vi.mock("@/lib/notifications/engine", async () => {
  const { mergePrefs } = await import("@/lib/notifications/prefs");
  return {
    refreshForMember: vi.fn(async () => {}),
    loadPrefs: vi.fn(async () => ({ prefs: mergePrefs(h.prefs), refreshedAt: null })),
  };
});
vi.mock("@/lib/mongodb", () => ({
  getDatabase: async () => ({
    collection: (n: string) =>
      n === "members"
        ? { updateOne: h.memberUpdate }
        : { find: () => ({ limit: () => ({ toArray: async () => h.rows }) }), updateOne: h.updateOne, updateMany: h.updateMany },
  }),
}));

import { NextRequest } from "next/server";
import { GET, PATCH } from "@/app/api/member/notifications/route";
import { GET as PREFS_GET, PUT as PREFS_PUT } from "@/app/api/member/notification-preferences/route";

const FUTURE = new Date(Date.now() + 86400000).toISOString();
const row = (over: Record<string, unknown>) => ({ notificationId: "n", title: "t", message: "", link: "/x", createdAt: "2026-01-01T00:00:00Z", expiresAt: FUTURE, readAt: null, ...over });
const patch = (body?: unknown, qs = "") =>
  PATCH(new NextRequest(`http://x/api/member/notifications${qs}`, { method: "PATCH", ...(body ? { body: JSON.stringify(body), headers: { "content-type": "application/json" } } : {}) }));

beforeEach(() => {
  vi.clearAllMocks();
  h.session = { memberId: "m1" };
  h.prefs = null;
  h.rows = [];
});

describe("GET /api/member/notifications?inbox=1", () => {
  const get = () => GET(new NextRequest("http://x/api/member/notifications?inbox=1"));

  it("lists unread first then by when it happens, classifying older reminders", async () => {
    h.rows = [
      row({ notificationId: "later", level: "club", category: "matches", eventAt: "2026-12-02T00:00:00Z" }),
      row({ notificationId: "sooner", level: "club", category: "matches", eventAt: "2026-12-01T00:00:00Z" }),
      row({ notificationId: "seen", level: "club", category: "matches", eventAt: "2026-11-01T00:00:00Z", readAt: "2026-11-02T00:00:00Z" }),
      row({ notificationId: "renew", type: "renewal_reminder" }),
    ];
    const d = await (await get()).json();
    expect(d.notifications.map((n: { notificationId: string }) => n.notificationId)).toEqual(["renew", "sooner", "later", "seen"]);
    expect(d.unread).toBe(3);
    expect(d.notifications[0]).toMatchObject({ level: "club", category: "membership" });
  });

  it("hides what the person has switched off", async () => {
    h.prefs = { levels: { personal: false }, categories: { events: { inApp: false } } };
    h.rows = [
      row({ notificationId: "p", level: "personal", category: "approvals" }),
      row({ notificationId: "e", level: "club", category: "events" }),
      row({ notificationId: "m", level: "club", category: "matches" }),
    ];
    const d = await (await get()).json();
    expect(d.notifications.map((n: { notificationId: string }) => n.notificationId)).toEqual(["m"]);
  });

  it("is empty for an account with no member profile", async () => {
    h.session = { name: "Admin" };
    expect(await (await get()).json()).toEqual({ notifications: [] });
  });

  it("needs sign-in", async () => {
    h.session = null;
    expect((await get()).status).toBe(401);
  });
});

describe("PATCH /api/member/notifications", () => {
  it("marks one read, scoped to the member", async () => {
    expect((await patch({ action: "read", notificationId: "n1" })).status).toBe(200);
    const [filter, update] = h.updateOne.mock.calls[0] as unknown as [Record<string, unknown>, { $set: Record<string, unknown> }];
    expect(filter).toEqual({ memberId: "m1", notificationId: "n1" });
    expect(Object.keys(update.$set)).toEqual(["readAt"]);
  });

  it("dismisses and marks read together", async () => {
    await patch({ action: "dismiss", notificationId: "n1" });
    const [, update] = h.updateOne.mock.calls[0] as unknown as [unknown, { $set: Record<string, unknown> }];
    expect(Object.keys(update.$set).sort()).toEqual(["dismissedAt", "readAt"]);
  });

  it("marks everything of mine read", async () => {
    await patch({ action: "read-all" });
    expect((h.updateMany.mock.calls[0] as unknown as [Record<string, unknown>])[0]).toEqual({ memberId: "m1", readAt: null });
  });

  it("rejects an unknown action or a missing id", async () => {
    expect((await patch({ action: "explode", notificationId: "n1" })).status).toBe(400);
    expect((await patch({ action: "read" })).status).toBe(400);
  });

  it("404s when it isn't theirs", async () => {
    h.updateOne.mockResolvedValueOnce({ matchedCount: 0 });
    expect((await patch({ action: "read", notificationId: "other" })).status).toBe(404);
  });

  it("still supports the banner's dismiss by query string", async () => {
    expect((await patch(undefined, "?notificationId=n9")).status).toBe(200);
    expect((h.updateOne.mock.calls[0] as unknown as [Record<string, unknown>])[0]).toEqual({ notificationId: "n9", memberId: "m1" });
  });
});

describe("notification preferences", () => {
  const put = (body: unknown) => PREFS_PUT(new NextRequest("http://x/api/member/notification-preferences", { method: "PUT", body: JSON.stringify(body), headers: { "content-type": "application/json" } }));

  it("returns the defaults and which channels are live", async () => {
    const d = await (await PREFS_GET()).json();
    expect(d.live).toEqual(["inApp"]);
    expect(d.prefs.enabled).toBe(true);
  });

  it("saves a change on top of what's stored and asks for a fresh look at the inbox", async () => {
    h.prefs = { levels: { club: false } };
    const d = await (await put({ levels: { global: false }, categories: { events: { inApp: false } } })).json();
    expect(d.prefs.levels).toEqual({ global: false, association: true, club: false, personal: true });
    expect(d.prefs.categories.events.inApp).toBe(false);
    const [filter, update] = h.memberUpdate.mock.calls[0] as unknown as [Record<string, unknown>, { $set: Record<string, unknown> }];
    expect(filter).toEqual({ memberId: "m1" });
    expect(update.$set.notificationsRefreshedAt).toBeNull();
  });

  it("needs a member profile and a JSON object", async () => {
    expect((await PREFS_PUT(new NextRequest("http://x", { method: "PUT", body: "nope" }))).status).toBe(400);
    h.session = { name: "Admin" };
    expect((await put({})).status).toBe(400);
    h.session = null;
    expect((await PREFS_GET()).status).toBe(401);
  });
});
