import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const h = vi.hoisted(() => ({
  perms: [] as string[],
  fixture: {} as Record<string, unknown>,
  updates: [] as unknown[],
  deletes: [] as unknown[],
  audits: [] as unknown[],
  teamsFound: 2,
}));

vi.mock("@/lib/auth/middleware", () => ({
  requireAnyPermission: vi.fn(async () => ({ user: { userId: "u", email: "e", permissions: h.perms } })),
  requireResourceAccess: vi.fn(async () => ({ user: {} })),
}));
vi.mock("@/lib/audit/platformAuditLog", () => ({ logPlatformAudit: vi.fn(async (e: unknown) => { h.audits.push(e); }) }));
vi.mock("@/lib/competitions/standingsReadCache", () => ({ invalidateStandingsBundleCache: vi.fn() }));
vi.mock("@/lib/mongodb", () => ({
  default: Promise.resolve({
    db: () => ({
      collection: (name: string) => ({
        findOne: async () => (name === "season_competitions" ? { owningAssociationId: "bha" } : h.fixture),
        find: () => ({ project: () => ({ toArray: async () => Array.from({ length: h.teamsFound }, (_, i) => ({ teamId: `t${i}` })) }) }),
        updateOne: async (_f: unknown, u: unknown) => { h.updates.push(u); },
        deleteMany: async (f: unknown) => { h.deletes.push(f); },
      }),
    }),
  }),
}));

import { POST } from "@/app/api/admin/season-competitions/[seasonCompetitionId]/fixtures/[fixtureId]/control/route";

const call = async (body: unknown) =>
  (await POST(
    new NextRequest("http://x/api", { method: "POST", body: JSON.stringify(body) }),
    { params: Promise.resolve({ seasonCompetitionId: "sc", fixtureId: "f1" }) },
  ))!;

describe("fixture control", () => {
  beforeEach(() => {
    h.perms = ["competitions.manage"]; h.updates = []; h.deletes = []; h.audits = []; h.teamsFound = 2;
    h.fixture = { fixtureId: "f1", homeTeamId: "a", awayTeamId: "b", status: "scheduled" };
  });

  it("changes teams, drops stale rosters and audits", async () => {
    const r = await call({ action: "change_teams", homeTeamId: "x", awayTeamId: "y", reason: "Wrong draw" });
    expect(r.status).toBe(200);
    expect(h.updates[0]).toMatchObject({ $set: { homeTeamId: "x", awayTeamId: "y" } });
    expect(h.deletes[0]).toMatchObject({ fixtureId: "f1", teamId: { $nin: ["x", "y"] } });
    expect(h.audits[0]).toMatchObject({ action: "change_teams", metadata: { reason: "Wrong draw" } });
  });

  it("requires a reason", async () => {
    expect((await call({ action: "change_teams", homeTeamId: "x", awayTeamId: "y", reason: " " })).status).toBe(400);
    expect(h.updates).toHaveLength(0);
  });

  it("rejects the same team twice and unknown teams", async () => {
    expect((await call({ action: "change_teams", homeTeamId: "x", awayTeamId: "x", reason: "typo" })).status).toBe(400);
    h.teamsFound = 1;
    expect((await call({ action: "change_teams", homeTeamId: "x", awayTeamId: "y", reason: "typo" })).status).toBe(400);
  });

  it("won't change teams once started or approved", async () => {
    h.fixture.status = "in_progress";
    expect((await call({ action: "change_teams", homeTeamId: "x", awayTeamId: "y", reason: "late" })).status).toBe(409);
    h.fixture = { ...h.fixture, status: "scheduled", resultStatus: "approved" };
    expect((await call({ action: "change_teams", homeTeamId: "x", awayTeamId: "y", reason: "late" })).status).toBe(409);
  });

  it("voids: cancels and clears the result, audited with before/after", async () => {
    h.fixture = { ...h.fixture, status: "completed", result: { homeScore: 2, awayScore: 1 }, resultStatus: "approved" };
    const r = await call({ action: "void", reason: "Abandoned, replay" });
    expect(r.status).toBe(200);
    expect(h.updates[0]).toMatchObject({ $set: { status: "cancelled", result: null, resultStatus: null } });
    expect(h.audits[0]).toMatchObject({ action: "void", before: { resultStatus: "approved" } });
  });

  it("enforces per-action permissions", async () => {
    h.perms = ["competitions.fixtures"];
    expect((await call({ action: "void", reason: "nope" })).status).toBe(403);
    h.perms = ["results.manage"];
    expect((await call({ action: "change_teams", homeTeamId: "x", awayTeamId: "y", reason: "nope" })).status).toBe(403);
  });
});
