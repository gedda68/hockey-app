import { describe, expect, it } from "vitest";
import { setFixturesPublished } from "@/lib/competitions/publishing";
import { writableDb } from "../helpers/writableDb";

describe("publishing matches", () => {
  it("publishes and unpublishes all or one round, skipping cancelled", async () => {
    const t = { league_fixtures: [
      { seasonCompetitionId: "S", round: 1, status: "scheduled", published: false }, { seasonCompetitionId: "S", round: 2, status: "scheduled", published: false },
      { seasonCompetitionId: "S", round: 2, status: "cancelled", published: false }, { seasonCompetitionId: "X", round: 1, status: "scheduled", published: false },
    ] } as never;
    const db = writableDb(t) as never;
    expect(await setFixturesPublished(db, "S", true, 1)).toBe(1);
    expect((t as any).league_fixtures[0]).toMatchObject({ published: true }); expect((t as any).league_fixtures[1].published).toBe(false);
    expect(await setFixturesPublished(db, "S", true)).toBe(2);
    expect((t as any).league_fixtures[2].published).toBe(false); expect((t as any).league_fixtures[3].published).toBe(false);
    expect(await setFixturesPublished(db, "S", false)).toBe(2);
    expect((t as any).league_fixtures[0]).toMatchObject({ published: false, publishedAt: null });
  });
});

import { summariseRounds } from "@/lib/competitions/publishing";
describe("round summary", () => {
  it("counts published matches per round and labels finals weeks", () => {
    const r = summariseRounds([
      { round: 1, published: true }, { round: 1, published: false }, { round: 2, published: false }, { round: 2, status: "cancelled", published: true },
      { round: 19, matchLevel: "finals", published: false }, { round: 20, matchLevel: "finals", published: true },
    ]);
    expect(r.map((x) => [x.label, x.published, x.total])).toEqual([["Round 1", 1, 2], ["Round 2", 0, 1], ["Finals week 1", 0, 1], ["Finals week 2", 1, 1]]);
  });
});
