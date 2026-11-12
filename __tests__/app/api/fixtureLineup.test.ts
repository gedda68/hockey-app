import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  fixture: {} as Record<string, unknown>,
  perms: [] as string[],
  assocOk: false,
  clubOk: false,
  saved: null as unknown,
  audits: [] as unknown[],
}));

vi.mock("@/lib/auth/middleware", () => ({
  requireAnyPermission: vi.fn(async () => ({
    user: { userId: "u1", email: "u@x", permissions: h.perms },
  })),
}));
vi.mock("@/lib/auth/session", () => ({ getSession: vi.fn(async () => ({})) }));
vi.mock("@/lib/auth/resourceAccessDb", () => ({
  userCanAccessAssociationResource: vi.fn(async () => h.assocOk),
  userCanAccessClubResource: vi.fn(async () => h.clubOk),
}));
vi.mock("@/lib/audit/platformAuditLog", () => ({
  logPlatformAudit: vi.fn(async (e: unknown) => { h.audits.push(e); }),
}));
vi.mock("@/lib/mongodb", () => ({
  default: Promise.resolve({
    db: () => ({
      collection: (name: string) => ({
        findOne: async () =>
          name === "league_fixtures" ? h.fixture
          : name === "teams" ? { teamId: "t-home", clubId: "club-1" }
          : null,
        find: () => ({ project: () => ({ toArray: async () => [{ memberId: "m1" }] }) }),
        replaceOne: async (_f: unknown, doc: unknown) => { h.saved = doc; },
      }),
    }),
  }),
}));

import { PUT } from "@/app/api/admin/season-competitions/[seasonCompetitionId]/fixtures/[fixtureId]/lineups/[teamId]/route";

const call = async (body: unknown, teamId = "t-home") =>
  (await PUT(
    new Request("http://x", { method: "PUT", body: JSON.stringify(body) }) as never,
    { params: Promise.resolve({ seasonCompetitionId: "sc", fixtureId: "f1", teamId }) },
  ))!;
const player = { memberId: "m1", shirtNumber: 7 };

describe("PUT fixture lineup", () => {
  beforeEach(() => {
    h.saved = null; h.audits = []; h.assocOk = false; h.clubOk = true;
    h.perms = ["team.roster"];
    h.fixture = {
      fixtureId: "f1", seasonCompetitionId: "sc", owningAssociationId: "a1",
      homeTeamId: "t-home", awayTeamId: "t-away", status: "scheduled",
      scheduledStart: new Date(Date.now() + 3600_000).toISOString(),
    };
  });

  it("lets a club save its own roster before the cutoff", async () => {
    const res = await call({ players: [player] });
    expect(res.status).toBe(200);
    expect(h.saved).toMatchObject({ source: "manual", teamId: "t-home" });
  });

  it("refuses a club that does not own the team", async () => {
    h.clubOk = false;
    expect((await call({ players: [player] })).status).toBe(403);
    expect(h.saved).toBeNull();
  });

  it("locks clubs 5 minutes before the start", async () => {
    h.fixture.scheduledStart = new Date(Date.now() + 4 * 60_000).toISOString();
    expect((await call({ players: [player] })).status).toBe(409);
    expect(h.saved).toBeNull();
  });

  it("locks clubs once the match is in progress", async () => {
    h.fixture.status = "in_progress";
    expect((await call({ players: [player] })).status).toBe(409);
  });

  it("requires a reason for an association late change, then audits it", async () => {
    h.perms = ["competitions.fixtures"]; h.assocOk = true;
    h.fixture.status = "completed";
    expect((await call({ players: [player] })).status).toBe(400);
    const ok = await call({ players: [player], reason: "Scoresheet correction" });
    expect(ok.status).toBe(200);
    expect(h.audits[0]).toMatchObject({ action: "lineup.late_update" });
  });

  it("rejects a team that is not in the fixture", async () => {
    expect((await call({ players: [player] }, "t-other")).status).toBe(400);
  });

  it("rejects duplicate players", async () => {
    expect((await call({ players: [player, player] })).status).toBe(400);
  });
});
