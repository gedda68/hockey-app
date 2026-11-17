import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  signedIn: false,
  perms: [] as string[],
  clubAccess: true,
  updateOne: vi.fn(async () => ({ matchedCount: 1 })),
  deleteOne: vi.fn(async () => ({ deletedCount: 1 })),
  dbTouched: vi.fn(),
}));

const unauth = () => NextResponse.json({ error: "Unauthorized" }, { status: 401 });
const forbid = () => NextResponse.json({ error: "Forbidden" }, { status: 403 });

vi.mock("@/lib/auth/middleware", () => ({
  requireAuth: vi.fn(async () =>
    mocks.signedIn ? { user: { role: "club-admin" } } : { user: null, response: unauth() },
  ),
  requireRole: vi.fn(async () =>
    mocks.signedIn ? { user: { role: "super-admin" } } : { user: null, response: unauth() },
  ),
  requireAnyPermission: vi.fn(async (_r: unknown, perms: string[]) => {
    if (!mocks.signedIn) return { user: null, response: unauth() };
    if (!perms.some((p) => mocks.perms.includes(p))) return { user: {}, response: forbid() };
    return { user: {} };
  }),
  requireResourceAccess: vi.fn(async () =>
    mocks.clubAccess ? { user: {} } : { user: {}, response: forbid() },
  ),
}));

vi.mock("@/lib/mongodb", () => ({
  getDatabaseName: () => "hockey-app",
  default: Promise.resolve({
    db: () => ({
      collection: (name: string) => {
        mocks.dbTouched(name);
        return {
          findOne: async () => (name === "clubs" ? { id: "club-1", slug: "bha" } : { memberId: "m1", clubId: "club-1" }),
          find: () => ({ limit: () => ({ toArray: async () => [] }), sort: () => ({ skip: () => ({ limit: () => ({ toArray: async () => [] }) }) }), toArray: async () => [] }),
          countDocuments: async () => 0,
          updateOne: mocks.updateOne,
          deleteOne: mocks.deleteOne,
        };
      },
    }),
    startSession: () => ({ withTransaction: async (f: () => Promise<void>) => f(), endSession: async () => {} }),
  }),
}));

import { NextRequest } from "next/server";
import * as member from "@/app/api/clubs/[clubId]/members/[memberId]/route";
import * as audit from "@/app/api/clubs/[clubId]/members/[memberId]/audit/route";
import * as renew from "@/app/api/clubs/[clubId]/members/[memberId]/renew/route";
import * as search from "@/app/api/clubs/[clubId]/members/search/route";
import * as roster from "@/app/api/clubs/[clubId]/teams/[teamId]/roster/route";
import * as rosterMember from "@/app/api/clubs/[clubId]/teams/[teamId]/roster/[memberId]/route";
import * as leadership from "@/app/api/clubs/[clubId]/teams/[teamId]/leadership/route";
import * as rosters from "@/app/api/rosters/route";
import * as upload from "@/app/api/upload/route";
import { stripProtectedMemberFields } from "@/lib/clubs/guardClubRoute";

const req = (method: string, body?: unknown, url = "http://x/api?q=ab") =>
  new NextRequest(url, { method, body: body ? JSON.stringify(body) : undefined, headers: { "content-type": "application/json" } });
const p = <T extends Record<string, string>>(o: T) => ({ params: Promise.resolve(o) });
const M = { clubId: "bha", memberId: "m1" };
const T = { clubId: "bha", teamId: "t1", memberId: "m1" };

const calls: [string, () => Promise<Response>][] = [
  ["member GET", () => member.GET(req("GET"), p(M))],
  ["member PUT", () => member.PUT(req("PUT", { roles: ["super-admin"] }), p(M))],
  ["member DELETE", () => member.DELETE(req("DELETE"), p(M))],
  ["audit GET", () => audit.GET(req("GET"), p(M))],
  ["renew POST", () => renew.POST(req("POST", {}), p(M))],
  ["renew GET", () => renew.GET(req("GET"), p(M))],
  ["search GET", () => search.GET(req("GET"), p({ clubId: "bha" }))],
  ["roster POST", () => roster.POST(req("POST", {}), p(T))],
  ["roster member PUT", () => rosterMember.PUT(req("PUT", {}), p(T))],
  ["roster member DELETE", () => rosterMember.DELETE(req("DELETE"), p(T))],
  ["leadership PUT", () => leadership.PUT(req("PUT", {}), p(T))],
  ["rosters POST", () => rosters.POST(req("POST", { ageGroup: "U12", season: "2026" }))],
  ["upload POST", () => upload.POST(req("POST"))],
];

describe("club member & roster routes are not open", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.signedIn = false;
    mocks.perms = [];
    mocks.clubAccess = true;
  });

  it.each(calls)("%s returns 401 when signed out and never touches data", async (_n, run) => {
    const res = await run();
    expect(res.status).toBe(401);
    expect(mocks.updateOne).not.toHaveBeenCalled();
    expect(mocks.deleteOne).not.toHaveBeenCalled();
    expect(mocks.dbTouched).not.toHaveBeenCalled();
  });

  it("member PUT/DELETE return 403 for a signed-in user without the permission", async () => {
    mocks.signedIn = true;
    mocks.perms = ["member.view"];
    expect((await member.PUT(req("PUT", { a: 1 }), p(M))).status).toBe(403);
    expect((await member.DELETE(req("DELETE"), p(M))).status).toBe(403);
    expect(mocks.updateOne).not.toHaveBeenCalled();
    expect(mocks.deleteOne).not.toHaveBeenCalled();
  });

  it("returns 403 when the user has the permission but not this club", async () => {
    mocks.signedIn = true;
    mocks.perms = ["member.edit", "member.delete", "member.view", "team.roster"];
    mocks.clubAccess = false;
    expect((await member.PUT(req("PUT", { a: 1 }), p(M))).status).toBe(403);
    expect((await member.DELETE(req("DELETE"), p(M))).status).toBe(403);
    expect((await roster.POST(req("POST", {}), p(T))).status).toBe(403);
    expect(mocks.updateOne).not.toHaveBeenCalled();
  });

  it("member PUT with access updates but drops role and login fields", async () => {
    mocks.signedIn = true;
    mocks.perms = ["member.edit"];
    const res = await member.PUT(
      req("PUT", { "personalInfo.firstName": "Sam", roles: ["super-admin"], passwordHash: "x", clubId: "other", roleHoldings: [{}] }),
      p(M),
    );
    expect(res.status).toBe(200);
    const set = (mocks.updateOne.mock.calls[0] as unknown as [unknown, { $set: Record<string, unknown> }])[1].$set;
    expect(set["personalInfo.firstName"]).toBe("Sam");
    for (const k of ["roles", "passwordHash", "clubId", "roleHoldings"]) expect(set).not.toHaveProperty(k);
  });

  it("stripProtectedMemberFields blocks dotted paths and operators", () => {
    expect(stripProtectedMemberFields({ "roles.0": "x", $set: {}, "contact.phone": "1", memberId: "z" })).toEqual({ "contact.phone": "1" });
  });
});
