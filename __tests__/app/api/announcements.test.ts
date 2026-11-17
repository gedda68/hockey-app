import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  session: null as Record<string, unknown> | null,
  insertOne: vi.fn(async () => ({})),
  find: vi.fn(),
  clubOk: true,
  assocOk: true,
}));
vi.mock("@/lib/auth/session", () => ({ getSession: vi.fn(async () => h.session) }));
vi.mock("@/lib/auth/sessionMember", () => ({ resolveSessionMemberId: vi.fn(async () => "MBR-1") }));
vi.mock("@/lib/access/memberAccess", () => ({ accessForSession: vi.fn(async () => null) }));
vi.mock("@/lib/auth/resourceAccessDb", () => ({
  userCanAccessClubResource: vi.fn(async () => h.clubOk),
  userCanAccessAssociationResource: vi.fn(async () => h.assocOk),
}));
vi.mock("@/lib/mongodb", () => ({
  getDatabase: async () => ({
    collection: () => ({
      insertOne: h.insertOne,
      find: (q: unknown) => { h.find(q); return { sort: () => ({ limit: () => ({ toArray: async () => [] }) }) }; },
    }),
  }),
}));

import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/admin/announcements/route";

const post = (body: unknown) => POST(new NextRequest("http://x/api/admin/announcements", { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json" } }));
const ok = { level: "club", scopeId: "club-1", title: "T", body: "B" };

beforeEach(() => {
  vi.clearAllMocks();
  h.clubOk = true; h.assocOk = true;
  h.session = { memberId: "m", userId: "u", name: "Pat", role: "club-admin", clubId: "club-1", associationId: "assoc-1" };
});

describe("announcements API", () => {
  it("needs sign-in", async () => { h.session = null; expect((await post(ok)).status).toBe(401); });

  it("refuses people who don't run anything", async () => {
    h.session = { ...h.session, role: "coach" };
    expect((await post(ok)).status).toBe(403);
    expect((await GET(new NextRequest("http://x/api/admin/announcements"))).status).toBe(403);
  });

  it("lets a club admin publish to their club", async () => {
    const res = await post(ok);
    expect(res.status).toBe(201);
    expect(h.insertOne).toHaveBeenCalledWith(expect.objectContaining({ level: "club", scopeId: "club-1", status: "published", createdBy: "MBR-1" }));
  });

  it("stops a club admin writing to the association, everyone, or another club", async () => {
    expect((await post({ ...ok, level: "association", scopeId: "assoc-1" })).status).toBe(403);
    expect((await post({ ...ok, level: "global", scopeId: "" })).status).toBe(403);
    h.clubOk = false;
    expect((await post({ ...ok, scopeId: "club-2" })).status).toBe(403);
    expect(h.insertOne).not.toHaveBeenCalled();
  });

  it("lets only a super-admin write to everyone", async () => {
    h.session = { ...h.session, role: "super-admin" };
    expect((await post({ level: "global", title: "T", body: "B" })).status).toBe(201);
  });

  it("lets an association admin write to their association", async () => {
    h.session = { ...h.session, role: "association-admin" };
    expect((await post({ level: "association", scopeId: "assoc-1", title: "T", body: "B" })).status).toBe(201);
    h.assocOk = false;
    expect((await post({ level: "association", scopeId: "assoc-9", title: "T", body: "B" })).status).toBe(403);
  });

  it("lists only the author's own club and association", async () => {
    await GET(new NextRequest("http://x/api/admin/announcements"));
    expect(h.find).toHaveBeenCalledWith({ $or: [{ level: "club", scopeId: "club-1" }, { level: "association", scopeId: "assoc-1" }] });
  });
});
