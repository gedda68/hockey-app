import { describe, expect, it } from "vitest";
import { mergeDrawState } from "@/lib/tournaments/tournamentDraw";
import {
  collectKnockoutSkeletonMatches,
  generateRepKnockoutFixturesFromDraw,
  poolPlaceLabel,
} from "@/lib/tournaments/repTournamentKnockoutGenerate";

describe("collectKnockoutSkeletonMatches", () => {
  it("reads legacy knockout matches", () => {
    const d = mergeDrawState(undefined, {
      structure: "legacy_flat",
      format: "single_elimination",
      knockoutMatches: [
        {
          matchId: "m1",
          roundIndex: 0,
          order: 0,
          roundLabel: "SF",
          homeEntryId: "e1",
          awayEntryId: "e2",
        },
      ],
    });
    const rows = collectKnockoutSkeletonMatches(d);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.match.matchId).toBe("m1");
  });
});

describe("generateRepKnockoutFixturesFromDraw", () => {
  it("creates TBD labels from pool sources when entries unknown", () => {
    const draw = mergeDrawState(undefined, {
      structure: "legacy_flat",
      format: "single_elimination",
      knockoutMatches: [
        {
          matchId: "f1",
          roundIndex: 1,
          order: 0,
          roundLabel: "Final",
          homeSource: { poolId: "A", place: 1 },
          awaySource: { poolId: "B", place: 1 },
        },
      ],
    });
    const docs = generateRepKnockoutFixturesFromDraw({
      tournamentId: "tourn-ko-test",
      draw,
      entryByEntryId: new Map(),
      sequenceStart: 0,
      createdBy: "u1",
      nowIso: "2026-01-01T00:00:00.000Z",
    });
    expect(docs).toHaveLength(1);
    expect(docs[0]?.phase).toBe("knockout");
    expect(docs[0]?.homeEntryId).toBeNull();
    expect(docs[0]?.awayEntryId).toBeNull();
    expect(docs[0]?.homeSourceLabel).toBe(poolPlaceLabel("A", 1));
    expect(docs[0]?.awaySourceLabel).toBe(poolPlaceLabel("B", 1));
  });
});
