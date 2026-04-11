import { describe, expect, it } from "vitest";
import {
  collectPoolsFromDraw,
  generateRepPoolRoundRobinFixtures,
} from "@/lib/tournaments/repTournamentFixtureGenerate";
import { mergeDrawState } from "@/lib/tournaments/tournamentDraw";

describe("collectPoolsFromDraw", () => {
  it("reads legacy top-level pools with 2+ entries", () => {
    const d = mergeDrawState(undefined, {
      structure: "legacy_flat",
      format: "round_robin_pools",
      pools: [
        { poolId: "a", label: "A", entryIds: ["e1"] },
        { poolId: "b", label: "B", entryIds: ["e2", "e3"] },
      ],
    });
    const pools = collectPoolsFromDraw(d);
    expect(pools).toHaveLength(1);
    expect(pools[0]?.poolId).toBe("b");
  });

  it("reads pools from multi-division draw", () => {
    const d = mergeDrawState(undefined, {
      structure: "multi_division",
      format: "multi_division",
      divisions: [
        {
          divisionId: "d1",
          label: "D1",
          entryIds: ["a", "b"],
          pools: [
            { poolId: "p1", label: "P1", entryIds: ["a", "b"] },
          ],
        },
      ],
    });
    const pools = collectPoolsFromDraw(d);
    expect(pools).toHaveLength(1);
    expect(pools[0]?.divisionId).toBe("d1");
  });
});

describe("generateRepPoolRoundRobinFixtures", () => {
  it("creates one fixture per pairing for two-team pool", () => {
    const draw = mergeDrawState(undefined, {
      structure: "legacy_flat",
      format: "round_robin_pools",
      pools: [{ poolId: "x", label: "X", entryIds: ["e1", "e2"] }],
    });
    const map = new Map([
      ["e1", { entryId: "e1", teamId: "t1", teamName: "A" }],
      ["e2", { entryId: "e2", teamId: "t2", teamName: "B" }],
    ]);
    const docs = generateRepPoolRoundRobinFixtures({
      tournamentId: "tourn-test",
      draw,
      entryByEntryId: map,
      createdBy: "u1",
      nowIso: "2026-01-01T00:00:00.000Z",
    });
    expect(docs.length).toBe(1);
    expect(docs[0]?.homeEntryId).toBe("e1");
    expect(docs[0]?.awayEntryId).toBe("e2");
    expect(docs[0]?.phase).toBe("pool");
  });
});
