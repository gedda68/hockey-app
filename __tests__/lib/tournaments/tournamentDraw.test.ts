import { describe, expect, it } from "vitest";
import {
  applyDivisionPlayoffSkeleton,
  applyDivisionRankedSnakePools,
  assertDivisionsEntryDisjoint,
  buildCrossPoolWinnerRound,
  buildQFFourPoolsTopTwoInterleaved,
  buildSamePlaceParallelMatches,
  buildSemisTwoPoolsTopTwo,
  buildSingleEliminationFirstRound,
  collectEntryIdsReferencedInDraw,
  DEFAULT_TOURNAMENT_DRAW_STATE,
  distributeSnakePools,
  generateTournamentDrawState,
  mergeDrawState,
  nextPowerOf2,
  orderEntryIdsBySeeds,
  orderEntryIdsForRepSeeding,
} from "@/lib/tournaments/tournamentDraw";

describe("nextPowerOf2", () => {
  it("pads to power of two", () => {
    expect(nextPowerOf2(1)).toBe(1);
    expect(nextPowerOf2(5)).toBe(8);
    expect(nextPowerOf2(8)).toBe(8);
    expect(nextPowerOf2(9)).toBe(16);
  });
});

describe("orderEntryIdsBySeeds", () => {
  it("sorts by ascending seed; missing seeds last", () => {
    const ids = ["a", "b", "c"];
    const seeds = { a: 3, b: 1, c: 2 };
    expect(orderEntryIdsBySeeds(ids, seeds)).toEqual(["b", "c", "a"]);
  });
});

describe("orderEntryIdsForRepSeeding", () => {
  it("orders by seed; ties break alphabetically by team name then entry id", () => {
    const ids = ["e_z", "e_a", "e_b"];
    const seeds = { e_z: 5, e_a: 5, e_b: 5 };
    const names = { e_z: "Zebras", e_a: "Ants", e_b: "Bees" };
    expect(orderEntryIdsForRepSeeding(ids, seeds, names)).toEqual(["e_a", "e_b", "e_z"]);
  });

  it("places entries without a seed after those with a seed", () => {
    const ids = ["a", "b"];
    const seeds = { a: 1 };
    expect(orderEntryIdsForRepSeeding(ids, seeds)).toEqual(["a", "b"]);
  });
});

describe("distributeSnakePools", () => {
  it("puts all teams in one pool when poolCount is 1", () => {
    expect(distributeSnakePools(["a", "b", "c"], 1)).toEqual([["a", "b", "c"]]);
  });

  it("snakes across pools for eight teams and four pools", () => {
    const rows = distributeSnakePools(
      ["t1", "t2", "t3", "t4", "t5", "t6", "t7", "t8"],
      4,
    );
    expect(rows[0]).toEqual(["t1", "t8"]);
    expect(rows[1]).toEqual(["t2", "t7"]);
    expect(rows[2]).toEqual(["t3", "t6"]);
    expect(rows[3]).toEqual(["t4", "t5"]);
  });
});

describe("buildSingleEliminationFirstRound", () => {
  it("pairs best vs worst for a power-of-two bracket", () => {
    const m = buildSingleEliminationFirstRound(["A", "B", "C", "D"]);
    expect(m).toHaveLength(2);
    expect(m[0]).toMatchObject({
      homeEntryId: "A",
      awayEntryId: "D",
      roundIndex: 0,
    });
    expect(m[1]).toMatchObject({
      homeEntryId: "B",
      awayEntryId: "C",
    });
  });

  it("pads byes with null slots", () => {
    const m = buildSingleEliminationFirstRound(["A", "B", "C"]);
    expect(m).toHaveLength(2);
    expect(m[0]?.homeEntryId).toBe("A");
    expect(m[0]?.awayEntryId).toBeNull();
    expect(m[1]?.homeEntryId).toBe("B");
    expect(m[1]?.awayEntryId).toBe("C");
  });
});

describe("buildCrossPoolWinnerRound", () => {
  it("pairs consecutive pool ids", () => {
    const m = buildCrossPoolWinnerRound(["pa", "pb", "pc"]);
    expect(m).toHaveLength(1);
    expect(m[0]).toMatchObject({
      homeSource: { poolId: "pa", place: 1 },
      awaySource: { poolId: "pb", place: 1 },
    });
  });
});

describe("buildSamePlaceParallelMatches", () => {
  it("pairs pools 0–1 and 2–3 for each place", () => {
    const m = buildSamePlaceParallelMatches(["A", "B", "C", "D"], 2, "x");
    expect(m).toHaveLength(4);
    expect(m[0]).toMatchObject({
      homeSource: { poolId: "A", place: 1 },
      awaySource: { poolId: "B", place: 1 },
    });
    expect(m[2]).toMatchObject({
      homeSource: { poolId: "C", place: 1 },
      awaySource: { poolId: "D", place: 1 },
    });
  });
});

describe("buildQFFourPoolsTopTwoInterleaved", () => {
  it("builds four QF rows with interleaved top-two sources", () => {
    const m = buildQFFourPoolsTopTwoInterleaved(["pa", "pb", "pc", "pd"], "d1");
    expect(m).toHaveLength(4);
    expect(m[0]).toMatchObject({
      homeSource: { poolId: "pa", place: 1 },
      awaySource: { poolId: "pb", place: 2 },
    });
    expect(m[3]).toMatchObject({
      homeSource: { poolId: "pd", place: 1 },
      awaySource: { poolId: "pc", place: 2 },
    });
  });
});

describe("buildSemisTwoPoolsTopTwo", () => {
  it("builds A1 v B2 and B1 v A2", () => {
    const m = buildSemisTwoPoolsTopTwo(["pa", "pb"], "d1");
    expect(m).toHaveLength(2);
    expect(m[0]).toMatchObject({
      homeSource: { poolId: "pa", place: 1 },
      awaySource: { poolId: "pb", place: 2 },
    });
  });
});

describe("mergeDrawState", () => {
  it("defaults structure and overlays patch", () => {
    const d = mergeDrawState(undefined, { format: "single_elimination" });
    expect(d.structure).toBe("legacy_flat");
    expect(d.format).toBe("single_elimination");
    expect(DEFAULT_TOURNAMENT_DRAW_STATE.structure).toBe("legacy_flat");
  });
});

describe("assertDivisionsEntryDisjoint", () => {
  it("rejects duplicate entry ids across divisions", () => {
    const d = mergeDrawState(undefined, {
      structure: "multi_division",
      format: "multi_division",
      divisions: [
        {
          divisionId: "a",
          label: "A",
          entryIds: ["x"],
        },
        {
          divisionId: "b",
          label: "B",
          entryIds: ["x"],
        },
      ],
    });
    expect(assertDivisionsEntryDisjoint(d).ok).toBe(false);
  });
});

describe("collectEntryIdsReferencedInDraw", () => {
  it("collects pool, knockout, seed keys, and division entries", () => {
    const ids = collectEntryIdsReferencedInDraw(
      mergeDrawState(undefined, {
        structure: "multi_division",
        format: "multi_division",
        seeds: { e1: 1, e2: 2 },
        divisions: [
          {
            divisionId: "d1",
            label: "D1",
            entryIds: ["e1"],
            pools: [{ poolId: "p1", label: "P1", entryIds: ["e1"] }],
            knockoutMatches: [
              {
                matchId: "m1",
                roundIndex: 0,
                order: 0,
                homeEntryId: "e2",
                awayEntryId: null,
                divisionId: "d1",
              },
            ],
          },
        ],
      }),
    );
    expect(new Set(ids)).toEqual(new Set(["e1", "e2"]));
  });
});

describe("applyDivisionRankedSnakePools", () => {
  it("assigns ranked snake per division independently", () => {
    const base = mergeDrawState(undefined, {
      structure: "multi_division",
      format: "multi_division",
      seeds: { a: 1, b: 2, c: 3, d: 4 },
      divisions: [
        {
          divisionId: "north",
          label: "North",
          entryIds: ["a", "b"],
        },
        {
          divisionId: "south",
          label: "South",
          entryIds: ["c", "d"],
        },
      ],
    });
    const next = applyDivisionRankedSnakePools(
      base,
      [
        { divisionId: "north", poolCount: 2 },
        { divisionId: "south", poolCount: 1 },
      ],
      { randomizeOrder: false },
    );
    const north = next.divisions?.find((x) => x.divisionId === "north");
    const south = next.divisions?.find((x) => x.divisionId === "south");
    expect(north?.pools).toHaveLength(2);
    expect(north?.pools?.[0]?.entryIds).toContain("a");
    expect(south?.pools).toHaveLength(1);
    expect(south?.pools?.[0]?.entryIds).toEqual(["c", "d"]);
  });
});

describe("applyDivisionPlayoffSkeleton", () => {
  it("attaches QF skeleton to a division", () => {
    const base = mergeDrawState(undefined, {
      structure: "multi_division",
      format: "multi_division",
      divisions: [
        {
          divisionId: "open",
          label: "Open",
          entryIds: ["a", "b", "c", "d", "e", "f", "g", "h"],
          pools: [
            { poolId: "pa", label: "A", entryIds: [] },
            { poolId: "pb", label: "B", entryIds: [] },
            { poolId: "pc", label: "C", entryIds: [] },
            { poolId: "pd", label: "D", entryIds: [] },
          ],
        },
      ],
    });
    const next = applyDivisionPlayoffSkeleton(base, "open", {
      type: "qf_top_two_four_pools",
      pairing: "a1_b2_b1_a2_c1_d2_d1_c2",
    });
    const div = next.divisions?.[0];
    expect(div?.knockoutMatches?.length).toBe(4);
    expect(div?.knockoutMatches?.[0]?.divisionId).toBe("open");
  });
});

describe("generateTournamentDrawState", () => {
  const entries = ["a", "b", "c", "d", "e", "f", "g", "h"];

  it("builds snake pools", () => {
    const d = generateTournamentDrawState(
      {
        kind: "snake_pools",
        poolCount: 4,
        randomizeOrder: false,
      },
      entries,
      {},
    );
    expect(d.format).toBe("round_robin_pools");
    expect(d.structure).toBe("legacy_flat");
    expect(d.pools).toHaveLength(4);
    expect(d.pools?.[0]?.entryIds).toEqual(["a", "h"]);
  });

  it("builds single pool for snake_pools with poolCount 1", () => {
    const d = generateTournamentDrawState(
      {
        kind: "snake_pools",
        poolCount: 1,
        randomizeOrder: false,
      },
      entries,
      {},
    );
    expect(d.pools).toHaveLength(1);
    expect(d.pools?.[0]?.entryIds).toHaveLength(8);
  });

  it("builds single elimination", () => {
    const d = generateTournamentDrawState(
      {
        kind: "single_elimination",
        randomizeOrder: false,
      },
      entries,
      {},
    );
    expect(d.format).toBe("single_elimination");
    expect(d.knockoutMatches?.length).toBe(4);
  });

  it("builds pools then knockout crossover", () => {
    const d = generateTournamentDrawState(
      {
        kind: "pools_then_knockout",
        poolCount: 4,
        randomizeOrder: false,
      },
      entries,
      {},
    );
    expect(d.format).toBe("pools_then_knockout");
    expect(d.pools).toHaveLength(4);
    expect(d.knockoutMatches?.length).toBe(2);
    expect(d.knockoutMatches?.[0]?.homeSource?.place).toBe(1);
  });
});
