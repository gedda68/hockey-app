import { describe, it, expect } from "vitest";
import { uniquePlayers } from "@/lib/rosters/uniquePlayers";

describe("uniquePlayers", () => {
  it("keeps the first of each id and the original order", () => {
    const out = uniquePlayers([{ id: "a", n: 1 }, { id: "b", n: 2 }, { id: "a", n: 3 }]);
    expect(out).toEqual([{ id: "a", n: 1 }, { id: "b", n: 2 }]);
  });
  it("handles undefined and id-less rows", () => {
    expect(uniquePlayers(undefined)).toEqual([]);
    expect(uniquePlayers([{}, {}]).length).toBe(2);
  });
});
