import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const d = vi.hoisted(() => ({
  queries: [] as { name: string; q: unknown }[],
  deny: false,
  now: Date.now(),
}));

vi.mock("@/lib/auth/middleware", () => ({
  requireAnyPermission: vi.fn(async () => ({ user: {} })),
  requireResourceAccess: vi.fn(async () =>
    d.deny ? { user: {}, response: new Response("{}", { status: 403 }) } : { user: {} }),
}));
vi.mock("@/lib/mongodb", () => ({
  default: Promise.resolve({
    db: () => ({
      collection: (name: string) => ({
        findOne: async () => ({ id: "club-1", slug: "commercial", name: "Commercial" }),
        find: (q: unknown) => {
          d.queries.push({ name, q });
          const start = new Date(d.now + 3 * 3600_000).toISOString();
          const rows =
            name === "teams" ? (JSON.stringify(q).includes("club-1") && !JSON.stringify(q).includes("teamId")
              ? [{ teamId: "own-1", name: "Commercial BHL 2" }] : [{ teamId: "opp-1", name: "Redcliffe" }])
            : name === "league_fixtures" ? [{ fixtureId: "f1", seasonCompetitionId: "sc", round: 1, homeTeamId: "own-1", awayTeamId: "opp-1", scheduledStart: start, status: "scheduled" }]
            : name === "season_competitions" ? [{ seasonCompetitionId: "sc", season: "2026", competitionName: "BHL 2" }]
            : name === "fixture_lineups" ? [{ fixtureId: "f1", teamId: "own-1", players: [{ memberId: "m1" }] }]
            : [
                { memberId: "m1", personalInfo: { firstName: "Ann", lastName: "A" }, roles: ["player"] },
                { memberId: "c1", personalInfo: { firstName: "Cy", lastName: "C" }, roles: ["coach"] },
              ];
          const c = { project: () => c, toArray: async () => rows };
          return c;
        },
      }),
    }),
  }),
}));

import { GET } from "@/app/api/admin/clubs/[id]/match-rosters/route";

const call = async () =>
  (await GET(new NextRequest("http://x/api"), { params: Promise.resolve({ id: "commercial" }) }))!;

describe("club match-rosters API", () => {
  it("returns only the club's own team's matches, with opponent, open window and named count", async () => {
    const res = await call();
    const j = await res.json();
    expect(j.matches).toHaveLength(1);
    expect(j.matches[0]).toMatchObject({
      teamId: "own-1", teamName: "Commercial BHL 2", opponent: "Redcliffe", home: true,
      competition: "2026 - BHL 2", named: 1, window: { open: true },
    });
  });

  it("only offers the club's players (not coaches)", async () => {
    const j = await (await call()).json();
    expect(j.players.map((p: { name: string }) => p.name)).toEqual(["Ann A"]);
  });

  it("queries fixtures only for the club's own team ids", async () => {
    d.queries.length = 0;
    await call();
    const fx = d.queries.find((x) => x.name === "league_fixtures")!;
    expect(JSON.stringify(fx.q)).toContain("own-1");
    expect(JSON.stringify(fx.q)).not.toContain("opp-1");
  });

  it("refuses a user without club access", async () => {
    d.deny = true;
    expect((await call()).status).toBe(403);
    d.deny = false;
  });
});
