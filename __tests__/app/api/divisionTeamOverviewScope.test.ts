import { beforeEach, describe, expect, it, vi } from "vitest";

const data = vi.hoisted(() => ({
  clubs: [{ clubId: "c1", name: "C1" }],
  teams: [
    { teamId: "t1", clubId: "c1", name: "A", seasonCompetitionId: "sc-2" },
    { teamId: "t2", clubId: "c1", name: "B", seasonCompetitionId: "sc-1" }, // other division
    { teamId: "t3", clubId: "c1", name: "C" }, // untagged, but plays in sc-2 fixtures
    { teamId: "t4", clubId: "c1", name: "D" }, // untagged, plays elsewhere
  ],
  seasons: [
    { seasonCompetitionId: "sc-1", season: "2026", divisions: [] },
    { seasonCompetitionId: "sc-2", season: "2026", divisions: [] },
  ],
  fixtures: [{ homeTeamId: "t1", awayTeamId: "t3" }],
}));

vi.mock("@/lib/auth/middleware", () => ({
  requireAnyPermission: vi.fn(async () => ({ user: {} })),
  requireResourceAccess: vi.fn(async () => ({ user: {} })),
}));
vi.mock("@/lib/mongodb", () => ({
  default: Promise.resolve({
    db: () => ({
      collection: (name: string) => ({
        find: () => {
          const rows =
            name === "clubs" ? data.clubs
            : name === "teams" ? data.teams
            : name === "season_competitions" ? data.seasons
            : data.fixtures;
          const c = { project: () => c, sort: () => c, toArray: async () => rows };
          return c;
        },
      }),
    }),
  }),
}));

import { NextRequest } from "next/server";
import { GET } from "@/app/api/admin/associations/[associationId]/division-team-overview/route";

const call = async (qs = "") =>
  (await (
    await GET(new NextRequest(`http://x/api${qs}`), { params: Promise.resolve({ associationId: "bha" }) })
  )!.json()) as { seasons: { seasonCompetitionId: string; teamsUnassigned: { teamId: string }[] }[]; teamsOrphanSeason: unknown[] };

describe("division-team-overview scoping", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns only the requested competition's teams (tagged or in its fixtures)", async () => {
    const j = await call("?seasonCompetitionId=sc-2");
    expect(j.seasons.map((s) => s.seasonCompetitionId)).toEqual(["sc-2"]);
    expect(j.seasons[0].teamsUnassigned.map((t) => t.teamId).sort()).toEqual(["t1", "t3"]);
    expect(j.teamsOrphanSeason).toHaveLength(0);
  });

  it("still returns everything when unscoped", async () => {
    const j = await call();
    expect(j.seasons).toHaveLength(2);
  });
});
