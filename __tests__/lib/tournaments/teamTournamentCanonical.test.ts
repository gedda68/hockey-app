import { describe, expect, it } from "vitest";
import {
  canonicalTeamIdFromTeamDoc,
  entryCanonicalIdentity,
  findConflictingEntryByCanonical,
} from "@/lib/tournaments/teamTournamentCanonical";

describe("canonicalTeamIdFromTeamDoc", () => {
  it("uses canonical when set", () => {
    expect(
      canonicalTeamIdFromTeamDoc({ teamId: "t-2026-a", canonicalTeamId: "t-root" }),
    ).toBe("t-root");
  });
  it("falls back to teamId", () => {
    expect(canonicalTeamIdFromTeamDoc({ teamId: "t-2026-a" })).toBe("t-2026-a");
  });
});

describe("findConflictingEntryByCanonical", () => {
  const rows = [
    { teamId: "t-old", canonicalTeamId: "t-root", status: "registered", entryId: "e1" },
    { teamId: "t-other", status: "confirmed", entryId: "e2" },
  ];

  it("detects second team row with same canonical", () => {
    const hit = findConflictingEntryByCanonical(rows, "t-new", "t-root");
    expect(hit?.entryId).toBe("e1");
  });

  it("ignores withdrawn", () => {
    const w = [
      ...rows,
      { teamId: "t-gone", canonicalTeamId: "t-x", status: "withdrawn", entryId: "e3" },
    ];
    expect(findConflictingEntryByCanonical(w, "t-y", "t-x")).toBeUndefined();
  });

  it("no conflict for same teamId", () => {
    expect(findConflictingEntryByCanonical(rows, "t-old", "t-root")).toBeUndefined();
  });

  it("legacy entry without canonical uses teamId as identity", () => {
    expect(entryCanonicalIdentity({ teamId: "t-other" })).toBe("t-other");
    expect(findConflictingEntryByCanonical(rows, "t-x", "t-other")?.teamId).toBe("t-other");
  });
});
