import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  session: null as Record<string, unknown> | null,
  announcement: null as Record<string, unknown> | null,
  deliveries: [] as Record<string, unknown>[],
  clubOk: true,
}));
vi.mock("@/lib/auth/session", () => ({ getSession: vi.fn(async () => h.session) }));
vi.mock("@/lib/access/memberAccess", () => ({ accessForSession: vi.fn(async () => null) }));
vi.mock("@/lib/auth/resourceAccessDb", () => ({ userCanAccessClubResource: vi.fn(async () => h.clubOk), userCanAccessAssociationResource: vi.fn(async () => true) }));
vi.mock("@/lib/mongodb", () => ({
  getDatabase: async () => ({
    collection: (n: string) => ({
      findOne: async () => h.announcement,
      find: () => {
        const rows = n === "notification_deliveries" ? h.deliveries : n === "members" ? [{ memberId: "m2", personalInfo: { firstName: "Sam", lastName: "Lee" } }] : [];
        const chain: Record<string, unknown> = { toArray: async () => rows };
        chain.limit = () => chain; chain.sort = () => chain;
        return chain;
      },
    }),
  }),
}));

import { NextRequest } from "next/server";
import { GET } from "@/app/api/admin/announcements/[id]/deliveries/route";

const get = () => GET(new NextRequest("http://x/api/admin/announcements/A1/deliveries"), { params: Promise.resolve({ id: "A1" }) });

beforeEach(() => {
  h.clubOk = true;
  h.session = { memberId: "m", role: "club-admin", clubId: "c1" };
  h.announcement = { announcementId: "A1", level: "club", scopeId: "c1" };
  h.deliveries = [
    { memberId: "m1", channel: "inApp", status: "sent", at: "2026-06-01T00:00:00Z" },
    { memberId: "m2", channel: "inApp", status: "sent", at: "2026-06-01T00:00:00Z" },
    { memberId: "m2", channel: "email", status: "failed", error: "bounced", at: "2026-06-01T00:00:00Z" },
  ];
});

describe("GET /api/admin/announcements/{id}/deliveries", () => {
  it("needs sign-in and the right to manage it", async () => {
    h.session = null;
    expect((await get()).status).toBe(401);
    h.session = { memberId: "m", role: "coach", clubId: "c1" };
    expect((await get()).status).toBe(403);
    h.session = { memberId: "m", role: "club-admin", clubId: "c1" };
    h.clubOk = false;
    expect((await get()).status).toBe(403);
  });
  it("404s an unknown announcement", async () => {
    h.announcement = null;
    expect((await get()).status).toBe(404);
  });
  it("returns counts per channel and named failures", async () => {
    const body = await (await get()).json();
    expect(body.counts.inApp).toEqual({ sent: 2, failed: 0 });
    expect(body.counts.email).toEqual({ sent: 0, failed: 1 });
    expect(body.failures).toEqual([expect.objectContaining({ name: "Sam Lee", channel: "email", error: "bounced" })]);
  });
});
