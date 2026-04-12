/**
 * Epic K4 — automated smoke for the league “fixture → result → ladder” contract
 * (no browser; no DB). Mirrors: generate pairings → record result → standings rows.
 */
import { describe, expect, it } from "vitest";
import { generateRoundRobin } from "@/lib/competitions/roundRobin";
import { accumulateStandingsRowsFromFixtures } from "@/lib/competitions/standings";

describe("K4 league smoke — pairing → result → ladder accumulation", () => {
  it("generates at least one fixture pairing for two teams", () => {
    const pairs = generateRoundRobin(["team-a", "team-b"], {});
    expect(pairs.length).toBeGreaterThanOrEqual(1);
    const [first] = pairs;
    expect(first).toBeDefined();
    const ids = [first!.homeTeamId, first!.awayTeamId].sort();
    expect(ids).toEqual(["team-a", "team-b"].sort());
  });

  it("updates ladder-style row map after a completed approved result", () => {
    const fixtures = [
      {
        homeTeamId: "team-a",
        awayTeamId: "team-b",
        status: "completed" as const,
        resultStatus: "approved" as const,
        result: {
          resultType: "normal" as const,
          homeScore: 4,
          awayScore: 2,
        },
      },
    ];
    const rowMap = accumulateStandingsRowsFromFixtures(
      fixtures,
      {},
      true,
    );
    expect(rowMap.get("team-a")).toMatchObject({
      p: 1,
      w: 1,
      pts: 3,
      gf: 4,
      ga: 2,
    });
    expect(rowMap.get("team-b")).toMatchObject({
      p: 1,
      l: 1,
      pts: 0,
      gf: 2,
      ga: 4,
    });
  });
});
