import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const d = vi.hoisted(() => ({
  fixtures: [
    { fixtureId: "f2", round: 2, homeTeamId: "a", awayTeamId: "b", status: "scheduled", umpires: [] },
    { fixtureId: "f1", round: 1, homeTeamId: "a", awayTeamId: "b", status: "scheduled",
      umpires: [{ umpireType: "umpire", umpireId: "m-9", allocationStatus: "accepted" }] },
  ],
  register: [
    { officialRecordId: "o1", displayName: "Sam Ump", memberId: "m-9", levelLabel: "L2", allocationAvailability: "available" },
    { officialRecordId: "o2", displayName: "Away Ump", umpireNumber: "U7", allocationAvailability: "unavailable" },
    { officialRecordId: "o3", displayName: "No Id Ump" },
  ],
  teams: [{ teamId: "a", name: "Redcliffe" }, { teamId: "b", name: "Bulimba" }],
}));

vi.mock("@/lib/auth/middleware", () => ({
  requireAnyPermission: vi.fn(async () => ({ user: {} })),
  requireResourceAccess: vi.fn(async () => ({ user: {} })),
}));
vi.mock("@/lib/mongodb", () => ({
  default: Promise.resolve({
    db: () => ({
      collection: (name: string) => ({
        findOne: async () => ({ owningAssociationId: "bha" }),
        find: () => {
          const rows = name === "league_fixtures" ? d.fixtures : name === "association_official_register" ? d.register : d.teams;
          const c = { project: () => c, toArray: async () => rows };
          return c;
        },
      }),
    }),
  }),
}));

import { GET } from "@/app/api/admin/season-competitions/[seasonCompetitionId]/officials/route";

describe("officials API", () => {
  it("lists matches by round with team names and resolved umpire names", async () => {
    const j = await (await GET(new NextRequest("http://x/api"), { params: Promise.resolve({ seasonCompetitionId: "sc" }) }))!.json();
    expect(j.matches.map((m: { fixtureId: string }) => m.fixtureId)).toEqual(["f1", "f2"]);
    expect(j.matches[0]).toMatchObject({ home: "Redcliffe", away: "Bulimba" });
    expect(j.matches[0].umpires[0]).toMatchObject({ umpireId: "m-9", name: "Sam Ump" });
  });

  it("offers only referenceable officials and flags unavailable ones", async () => {
    const j = await (await GET(new NextRequest("http://x/api"), { params: Promise.resolve({ seasonCompetitionId: "sc" }) }))!.json();
    expect(j.officials.map((o: { displayName: string }) => o.displayName)).toEqual(["Away Ump", "Sam Ump"]);
    expect(j.officials.find((o: { umpireId: string }) => o.umpireId === "U7").available).toBe(false);
  });
});
