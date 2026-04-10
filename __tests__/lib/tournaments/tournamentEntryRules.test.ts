import { describe, expect, it } from "vitest";
import {
  calendarDateKey,
  evaluateClubEntryEligibility,
  isAfterEntryCloses,
  isBeforeEntryOpens,
  isPastInclusiveDeadline,
  mergeEntryRules,
} from "@/lib/tournaments/tournamentEntryRules";
import type { TournamentEntryRules } from "@/types/tournaments";

describe("calendar / deadline helpers", () => {
  it("detects past withdrawal deadline (strictly after calendar day)", () => {
    expect(isPastInclusiveDeadline("2099-12-31")).toBe(false);
    expect(isPastInclusiveDeadline("2000-01-01")).toBe(true);
    expect(isPastInclusiveDeadline(null)).toBe(false);
  });

  it("calendarDateKey trims to YYYY-MM-DD", () => {
    expect(calendarDateKey("2026-03-15T12:00:00.000Z")).toBe("2026-03-15");
  });

  it("isBeforeEntryOpens and isAfterEntryCloses use calendar days", () => {
    expect(isBeforeEntryOpens("2099-01-01")).toBe(true);
    expect(isAfterEntryCloses("2000-01-01")).toBe(true);
  });
});

describe("mergeEntryRules", () => {
  it("applies defaults and parses", () => {
    const r = mergeEntryRules(undefined, { maxTeams: 8 });
    expect(r.maxTeams).toBe(8);
    expect(r.entryEligibility).toBe("branding_association_clubs");
    expect(r.allowedClubIds).toEqual([]);
  });
});

describe("evaluateClubEntryEligibility", () => {
  const rules: TournamentEntryRules = {
    entryEligibility: "branding_association_clubs",
    allowedClubIds: [],
    maxTeams: null,
    entryOpensAt: null,
    entryClosesAt: null,
    withdrawalDeadline: null,
    entryFeeCents: null,
  };

  it("allows any club when branding association is missing", () => {
    const res = evaluateClubEntryEligibility(
      { tournamentId: "t1", brandingAssociationId: null },
      { id: "club-a", parentAssociationId: "assoc-x" },
      rules,
    );
    expect(res).toEqual({ ok: true });
  });

  it("requires parent match for branding_association_clubs", () => {
    const res = evaluateClubEntryEligibility(
      { tournamentId: "t1", brandingAssociationId: "assoc-1" },
      { id: "club-a", parentAssociationId: "assoc-2" },
      rules,
    );
    expect(res.ok).toBe(false);
  });

  it("explicit_clubs uses whitelist", () => {
    const r2: TournamentEntryRules = {
      ...rules,
      entryEligibility: "explicit_clubs",
      allowedClubIds: ["c1"],
    };
    expect(
      evaluateClubEntryEligibility(
        { tournamentId: "t1" },
        { id: "c1", parentAssociationId: "a" },
        r2,
      ).ok,
    ).toBe(true);
    expect(
      evaluateClubEntryEligibility(
        { tournamentId: "t1" },
        { id: "c2", parentAssociationId: "a" },
        r2,
      ).ok,
    ).toBe(false);
  });

  it("host_club_only matches host club id", () => {
    const r2: TournamentEntryRules = { ...rules, entryEligibility: "host_club_only" };
    expect(
      evaluateClubEntryEligibility(
        { tournamentId: "t1", hostType: "club", hostId: "club-x" },
        { id: "club-x", parentAssociationId: "a" },
        r2,
      ).ok,
    ).toBe(true);
    expect(
      evaluateClubEntryEligibility(
        { tournamentId: "t1", hostType: "club", hostId: "club-x" },
        { id: "club-y", parentAssociationId: "a" },
        r2,
      ).ok,
    ).toBe(false);
  });
});
