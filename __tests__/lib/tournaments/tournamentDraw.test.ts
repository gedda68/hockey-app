import { describe, expect, it } from "vitest";
import {
  buildCrossPoolWinnerRound,
  buildSingleEliminationFirstRound,
  collectEntryIdsReferencedInDraw,
  DEFAULT_TOURNAMENT_DRAW_STATE,
  distributeSnakePools,
  generateTournamentDrawState,
  mergeDrawState,
  nextPowerOf2,
  orderEntryIdsBySeeds,
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

describe("distributeSnakePools", () => {
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

describe("mergeDrawState", () => {
  it("defaults then overlays patch", () => {
    const d = mergeDrawState(undefined, { format: "single_elimination" });
    expect(d.format).toBe("single_elimination");
    expect(DEFAULT_TOURNAMENT_DRAW_STATE.format).toBe("none");
  });
});

describe("collectEntryIdsReferencedInDraw", () => {
  it("collects pool, knockout, and seed keys", () => {
    const ids = collectEntryIdsReferencedInDraw(
      mergeDrawState(undefined, {
        format: "round_robin_pools",
        seeds: { e1: 1, e2: 2 },
        pools: [{ poolId: "a", label: "A", entryIds: ["e1"] }],
        knockoutMatches: [
          {
            matchId: "m1",
            roundIndex: 0,
            order: 0,
            homeEntryId: "e2",
            awayEntryId: null,
          },
        ],
      }),
    );
    expect(new Set(ids)).toEqual(new Set(["e1", "e2"]));
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
    expect(d.pools).toHaveLength(4);
    expect(d.pools?.[0]?.entryIds).toEqual(["a", "h"]);
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
