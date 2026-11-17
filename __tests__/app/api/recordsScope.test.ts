import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  session: null as Record<string, unknown> | null,
  access: null as unknown,
  incidentFind: vi.fn(),
  injuryFind: vi.fn(),
  insertOne: vi.fn(async () => ({})),
  updateOne: vi.fn(async () => ({ matchedCount: 1 })),
}));
vi.mock("@/lib/auth/session", () => ({ getSession: vi.fn(async () => h.session) }));
vi.mock("@/lib/auth/sessionMember", () => ({ resolveSessionMemberId: vi.fn(async () => "MBR-1") }));
vi.mock("@/lib/access/memberAccess", () => ({ accessForSession: vi.fn(async () => h.access) }));
vi.mock("@/lib/auth/resourceAccessDb", () => ({ userCanAccessClubResource: vi.fn(async () => false) }));
vi.mock("@/lib/access/guardians", () => ({ childrenOf: vi.fn(async () => [{ memberId: "MBR-KID" }]) }));
vi.mock("@/lib/mongodb", () => ({
  getDatabase: async () => ({
    collection: (n: string) => ({
      find: (q: unknown) => {
        (n === "club_incidents" ? h.incidentFind : h.injuryFind)(q);
        return { sort: () => ({ limit: () => ({ toArray: async () => [] }) }) };
      },
      insertOne: h.insertOne,
      updateOne: h.updateOne,
      findOne: vi.fn(async () => null),
    }),
  }),
}));

import { NextRequest } from "next/server";
import { GET as INC_GET, POST as INC_POST } from "@/app/api/records/incidents/route";
import { PATCH as INC_PATCH } from "@/app/api/records/incidents/[id]/route";
import { GET as INJ_GET, POST as INJ_POST } from "@/app/api/records/injuries/route";

const req = (url: string, body?: unknown, method = "GET") =>
  new NextRequest(`http://x${url}`, { method, ...(body ? { body: JSON.stringify(body), headers: { "content-type": "application/json" } } : {}) });
const params = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  vi.clearAllMocks();
  h.session = { memberId: "abc", userId: "u1", name: "Pat", role: "member", clubId: "club-1" };
  h.access = null;
});

describe("incidents", () => {
  it("needs sign-in", async () => {
    h.session = null;
    expect((await INC_GET(req("/api/records/incidents"))).status).toBe(401);
  });

  it("shows an ordinary member only the reports they lodged", async () => {
    await INC_GET(req("/api/records/incidents"));
    expect(h.incidentFind).toHaveBeenCalledWith({ clubId: "club-1", reportedBy: "MBR-1" });
  });

  it("shows a club admin every report in their club", async () => {
    h.session = { ...h.session, role: "club-admin" };
    await INC_GET(req("/api/records/incidents"));
    expect(h.incidentFind).toHaveBeenCalledWith({ clubId: "club-1" });
  });

  it("won't read another club without access", async () => {
    h.session = { ...h.session, role: "club-admin" };
    expect((await INC_GET(req("/api/records/incidents?clubId=other"))).status).toBe(403);
  });

  it("lets any member lodge a report, confidential for child safety", async () => {
    const res = await INC_POST(req("/api/records/incidents", { occurredAt: "2026-01-01T10:00:00Z", category: "child-safety", description: "x" }, "POST"));
    expect(res.status).toBe(201);
    expect(h.insertOne).toHaveBeenCalledWith(expect.objectContaining({ confidential: true, reportedBy: "MBR-1", status: "reported" }));
  });

  it("stops a member managing reports and a committee from closing them", async () => {
    expect((await INC_PATCH(req("/api/records/incidents/i", { status: "under-review" }, "PATCH"), params("i"))).status).toBe(403);
    h.session = { ...h.session, role: "club-committee" };
    expect((await INC_PATCH(req("/api/records/incidents/i", { status: "closed" }, "PATCH"), params("i"))).status).toBe(403);
    expect((await INC_PATCH(req("/api/records/incidents/i", { status: "under-review" }, "PATCH"), params("i"))).status).toBe(200);
  });
});

describe("injuries", () => {
  it("limits an ordinary member to themselves and their children", async () => {
    await INJ_GET(req("/api/records/injuries"));
    expect(h.injuryFind).toHaveBeenCalledWith({ clubId: "club-1", memberId: { $in: ["MBR-1", "MBR-KID"] } });
  });

  it("doesn't let a member ask for someone else's", async () => {
    await INJ_GET(req("/api/records/injuries?memberId=MBR-OTHER"));
    expect(h.injuryFind).toHaveBeenCalledWith({ clubId: "club-1", memberId: { $in: ["MBR-1", "MBR-KID"] } });
  });

  it("lets a coach see all and member search, but a member can't add", async () => {
    h.session = { ...h.session, role: "coach" };
    await INJ_GET(req("/api/records/injuries"));
    expect(h.injuryFind).toHaveBeenCalledWith({ clubId: "club-1" });
    h.session = { ...h.session, role: "member" };
    const res = await INJ_POST(req("/api/records/injuries", { memberId: "MBR-1", occurredAt: "2026-01-01T10:00:00Z", bodyPart: "Knee" }, "POST"));
    expect(res.status).toBe(403);
  });
});
