import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const d = vi.hoisted(() => ({
  fixtures: [
    { fixtureId: "f1", homeTeamId: "t1", awayTeamId: "t2", scheduledStart: "2026-05-02T00:00:00Z", status: "completed" },
    { fixtureId: "f2", homeTeamId: "t3", awayTeamId: "t1", scheduledStart: "2026-05-09T00:00:00Z", status: "scheduled" },
  ],
  teams: [
    { teamId: "t1", name: "Commercial BHL 2", clubId: "c1" },
    { teamId: "t2", name: "Rivals", clubId: "c2" },
    { teamId: "t3", name: "Others", clubId: "c3" },
  ],
  lineups: [{ fixtureId: "f1", players: [{ memberId: "m1" }, { memberId: "loan" }] }],
  members: [
    { memberId: "m1", personalInfo: { firstName: "Ann", lastName: "A" }, roles: ["player"] },
    { memberId: "m2", personalInfo: { firstName: "Bob", lastName: "B" }, roles: ["player"] },
    { memberId: "coach", personalInfo: { firstName: "Cy", lastName: "C" }, roles: ["coach"] },
    { memberId: "loan", personalInfo: { firstName: "Lou", lastName: "L" }, roles: [] },
  ],
}));

vi.mock("@/lib/auth/middleware", () => ({
  requireAnyPermission: vi.fn(async () => ({ user: {} })),
  requireResourceAccess: vi.fn(async () => ({ user: {} })),
}));
vi.mock("@/lib/mongodb", () => ({
  default: Promise.resolve({
    db: () => ({
      collection: (name: string) => ({
        findOne: async () => ({ seasonCompetitionId: "sc", owningAssociationId: "bha" }),
        find: () => {
          const rows =
            name === "league_fixtures" ? d.fixtures
            : name === "teams" ? d.teams
            : name === "fixture_lineups" ? d.lineups
            : d.members;
          const c = { project: () => c, toArray: async () => rows };
          return c;
        },
      }),
    }),
  }),
}));

import { GET } from "@/app/api/admin/season-competitions/[seasonCompetitionId]/squad/route";

const call = async (qs = "") =>
  (await (await GET(new NextRequest(`http://x/api${qs}`), { params: Promise.resolve({ seasonCompetitionId: "sc" }) }))!.json());

describe("competition squad API", () => {
  it("lists the teams in the competition", async () => {
    const j = await call();
    expect(j.teams.map((t: { name: string }) => t.name)).toEqual(["Commercial BHL 2", "Others", "Rivals"]);
  });

  it("returns a team's matches and eligible players (not coaches), with appearances", async () => {
    const j = await call("?teamId=t1");
    expect(j.matches.map((m: { fixtureId: string; opponent: string; home: boolean }) => [m.fixtureId, m.opponent, m.home]))
      .toEqual([["f1", "Rivals", true], ["f2", "Others", false]]);
    const names = j.players.map((p: { name: string }) => p.name);
    expect(names).toContain("Ann A");
    expect(names).toContain("Bob B");
    expect(names).toContain("Lou L"); // named in a lineup, so eligible
    expect(names).not.toContain("Cy C");
    expect(j.players[0]).toMatchObject({ memberId: expect.any(String), appearances: 1 });
  });

  it("404s for a team not in the competition", async () => {
    const res = (await GET(new NextRequest("http://x/api?teamId=zzz"), { params: Promise.resolve({ seasonCompetitionId: "sc" }) }))!;
    expect(res.status).toBe(404);
  });
});
