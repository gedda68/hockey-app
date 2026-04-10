import { describe, expect, it } from "vitest";
import {
  activeRosterMemberIds,
  immediateFamilyRelatedMemberIds,
  isImmediateFamilyRelationship,
  memberPrimaryClubIdFromDoc,
  registerIndicatesUnavailable,
  resolvePrimaryClubId,
  slotHasValidCoiOverride,
} from "@/lib/officiating/umpireCoiAndAvailability";

describe("isImmediateFamilyRelationship", () => {
  it("matches parent / child style labels", () => {
    expect(
      isImmediateFamilyRelationship({
        forwardRelation: "Mother",
        reverseRelation: "",
        relationshipType: "",
      }),
    ).toBe(true);
    expect(
      isImmediateFamilyRelationship({
        forwardRelation: "Cousin",
        reverseRelation: "",
        relationshipType: "",
      }),
    ).toBe(false);
  });

  it("does not match godfather via substring false positive on father", () => {
    expect(
      isImmediateFamilyRelationship({
        forwardRelation: "Godfather",
        reverseRelation: "",
        relationshipType: "",
      }),
    ).toBe(false);
  });
});

describe("immediateFamilyRelatedMemberIds", () => {
  it("collects related ids for immediate labels only", () => {
    const member = {
      familyRelationships: [
        {
          relatedMemberId: "m-1",
          forwardRelation: "Son",
          reverseRelation: "",
          relationshipType: "",
        },
        {
          relatedMemberId: "m-2",
          forwardRelation: "Cousin",
          reverseRelation: "",
          relationshipType: "",
        },
      ],
    };
    expect([...immediateFamilyRelatedMemberIds(member)]).toEqual(["m-1"]);
  });
});

describe("memberPrimaryClubIdFromDoc", () => {
  it("prefers top-level clubId then membership.clubId", () => {
    expect(memberPrimaryClubIdFromDoc({ clubId: "club-a" })).toBe("club-a");
    expect(
      memberPrimaryClubIdFromDoc({
        membership: { clubId: "club-b" },
      }),
    ).toBe("club-b");
    expect(memberPrimaryClubIdFromDoc(null)).toBe(null);
  });
});

describe("resolvePrimaryClubId", () => {
  it("uses register primaryClubId over member doc", () => {
    expect(
      resolvePrimaryClubId(
        { primaryClubId: "reg-club" },
        { clubId: "mem-club" },
      ),
    ).toBe("reg-club");
    expect(resolvePrimaryClubId({}, { clubId: "mem-club" })).toBe("mem-club");
  });
});

describe("activeRosterMemberIds", () => {
  it("includes only active roster rows", () => {
    const team = {
      roster: [
        { memberId: "a", status: "active" },
        { memberId: "b", status: "injured" },
        { memberId: "c", status: "active" },
      ],
    };
    expect([...activeRosterMemberIds(team)].sort()).toEqual(["a", "c"]);
  });
});

describe("registerIndicatesUnavailable", () => {
  it("respects allocationAvailability and future unavailableUntil", () => {
    const past = "2020-01-01T00:00:00.000Z";
    const future = "2099-06-01T00:00:00.000Z";
    expect(
      registerIndicatesUnavailable(
        { allocationAvailability: "unavailable" },
        new Date("2026-01-01"),
      ),
    ).toBe(true);
    expect(
      registerIndicatesUnavailable(
        { allocationAvailability: "available", unavailableUntil: past },
        new Date("2026-01-01"),
      ),
    ).toBe(false);
    expect(
      registerIndicatesUnavailable(
        { allocationAvailability: "available", unavailableUntil: future },
        new Date("2026-01-01"),
      ),
    ).toBe(true);
  });
});

describe("slotHasValidCoiOverride", () => {
  it("requires flag and reason length", () => {
    expect(
      slotHasValidCoiOverride({
        umpireType: "field",
        umpireId: "x",
        coiOverride: true,
        coiOverrideReason: "short",
      }),
    ).toBe(false);
    expect(
      slotHasValidCoiOverride({
        umpireType: "field",
        umpireId: "x",
        coiOverride: true,
        coiOverrideReason: "No other qualified umpires available today for this grade.",
      }),
    ).toBe(true);
    expect(
      slotHasValidCoiOverride({
        umpireType: "field",
        umpireId: "x",
        coiOverride: false,
        coiOverrideReason: "No other qualified umpires available today for this grade.",
      }),
    ).toBe(false);
  });
});
