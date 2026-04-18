import { describe, it, expect } from "vitest";
import {
  generateRoundRobin,
  ROUND_ROBIN_BYE,
  roundRobinRoundCounts,
} from "@/lib/competitions/roundRobin";

describe("generateRoundRobin", () => {
  it("returns single home/away pair for two teams", () => {
    const f = generateRoundRobin(["a", "b"]);
    expect(f).toHaveLength(1);
    expect(f[0]).toMatchObject({ round: 1, homeTeamId: "a", awayTeamId: "b" });
  });

  it("never emits BYE as a team id in fixtures", () => {
    const f = generateRoundRobin(["a", "b", "c"]);
    for (const x of f) {
      expect(x.homeTeamId).not.toBe(ROUND_ROBIN_BYE);
      expect(x.awayTeamId).not.toBe(ROUND_ROBIN_BYE);
    }
  });

  it("doubles fixtures when doubleRound is true", () => {
    const single = generateRoundRobin(["a", "b", "c", "d"], {});
    const dbl = generateRoundRobin(["a", "b", "c", "d"], { doubleRound: true });
    expect(dbl.length).toBe(single.length * 2);
  });
});

describe("roundRobinRoundCounts", () => {
  it("matches generateRoundRobin lengths for four teams", () => {
    const c = roundRobinRoundCounts(4);
    expect(c.fixturesSingle).toBe(
      generateRoundRobin(["a", "b", "c", "d"], { doubleRound: false }).length,
    );
    expect(c.fixturesHomeAndAway).toBe(
      generateRoundRobin(["a", "b", "c", "d"], { doubleRound: true }).length,
    );
  });
});
