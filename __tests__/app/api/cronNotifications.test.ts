import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({ rows: [] as { memberId?: string }[], find: vi.fn(), refresh: vi.fn(async (_db: unknown, id: string) => { if (id === "BAD") throw new Error("x"); }) }));
vi.mock("@/lib/mongodb", () => ({
  getDatabase: async () => ({ collection: () => ({ find: (q: unknown) => { h.find(q); return { sort: () => ({ limit: () => ({ toArray: async () => h.rows }) }) }; } }) }),
}));
vi.mock("@/lib/notifications/engine", () => ({ refreshForMember: h.refresh }));

import { NextRequest } from "next/server";
import { GET } from "@/app/api/cron/notifications/route";
import { membersWithExtraChannelsFilter } from "@/lib/notifications/cronFilter";

const call = (qs = "", auth = "Bearer s3cret") => GET(new NextRequest(`http://x/api/cron/notifications${qs}`, { headers: auth ? { authorization: auth } : {} }));

beforeEach(() => { vi.clearAllMocks(); process.env.CRON_SECRET = "s3cret"; h.rows = [{ memberId: "A" }, { memberId: "BAD" }, { memberId: "C" }]; });

describe("notifications cron", () => {
  it("is closed without the secret", async () => {
    expect((await call("", "")).status).toBe(401);
    expect((await call("", "Bearer nope")).status).toBe(401);
    delete process.env.CRON_SECRET;
    expect((await call()).status).toBe(503);
  });
  it("refreshes everyone eligible and survives one failure", async () => {
    const body = await (await call()).json();
    expect(body).toMatchObject({ ok: true, eligible: 3, refreshed: 2, failed: 1, stoppedEarly: false });
    expect(h.refresh).toHaveBeenCalledTimes(3);
  });
  it("dry run changes nothing", async () => {
    const body = await (await call("?dryRun=true")).json();
    expect(body).toEqual({ ok: true, dryRun: true, eligible: 3 });
    expect(h.refresh).not.toHaveBeenCalled();
  });
  it("only targets members with email or SMS switched on", () => {
    const f = membersWithExtraChannelsFilter() as { $or: Record<string, boolean>[]; "notificationPrefs.enabled": unknown };
    expect(f["notificationPrefs.enabled"]).toEqual({ $ne: false });
    expect(f.$or).toContainEqual({ "notificationPrefs.categories.announcements.email": true });
    expect(f.$or).toContainEqual({ "notificationPrefs.categories.matches.sms": true });
    expect(f.$or.every((c) => !JSON.stringify(c).includes("inApp"))).toBe(true);
  });
});
