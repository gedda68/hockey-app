import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

type Row = Record<string, unknown>;
const { seasonRows, competitionRows } = vi.hoisted(() => ({
  seasonRows: [] as Row[],
  competitionRows: [] as Row[],
}));

vi.mock("@/lib/auth/middleware", () => ({
  requireAnyPermission: async () => ({ response: null }),
  requireResourceAccess: async () => ({ response: null }),
}));
vi.mock("@/lib/mongodb", () => ({
  default: Promise.resolve({
    db: () => ({
      collection: (name: string) => ({
        find: () => ({
          project: () => ({
            sort: () => ({ toArray: async () => seasonRows }),
            toArray: async () => (name === "competitions" ? competitionRows : []),
          }),
        }),
      }),
    }),
  }),
}));

import { GET } from "@/app/api/admin/associations/[associationId]/season-competitions/route";

async function labels() {
  const res = await GET({} as NextRequest, { params: Promise.resolve({ associationId: "bha" }) });
  const json = await res.json();
  return (json.seasonCompetitions as { label: string }[]).map((s) => s.label);
}

describe("season-competitions list labels", () => {
  beforeEach(() => {
    seasonRows.length = 0;
    competitionRows.length = 0;
  });

  it("uses the competition name stored on the season record (imported data)", async () => {
    seasonRows.push({ seasonCompetitionId: "sc-1", competitionId: "x", season: "2026", competitionName: "BHL 2" });
    expect(await labels()).toEqual(["2026 - BHL 2"]);
  });

  it("falls back to the competition's own name", async () => {
    seasonRows.push({ seasonCompetitionId: "sc-1", competitionId: "c-1", season: "2026" });
    competitionRows.push({ competitionId: "c-1", name: "BHL1" });
    expect(await labels()).toEqual(["2026 - BHL1"]);
  });

  it("uses the display name without repeating the year", async () => {
    seasonRows.push({ seasonCompetitionId: "sc-1", competitionId: "c-1", season: "2026", displayName: "2026 BHL 2" });
    expect(await labels()).toEqual(["2026 - BHL 2"]);
  });

  it("never includes status or ids", async () => {
    seasonRows.push({ seasonCompetitionId: "sc-altius-123", competitionId: "c", season: "2026", status: "completed", competitionName: "BHL 3" });
    const [label] = await labels();
    expect(label).toBe("2026 - BHL 3");
  });
});
