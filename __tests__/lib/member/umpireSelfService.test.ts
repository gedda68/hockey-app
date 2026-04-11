import { describe, it, expect } from "vitest";
import {
  flattenAssignmentsFromFixtures,
  mergeUmpireSlotAllocationStatus,
  umpireIdKeysFromRegister,
} from "@/lib/member/umpireSelfService";

describe("umpireIdKeysFromRegister", () => {
  it("always includes trimmed member id", () => {
    const s = umpireIdKeysFromRegister("  M-1  ", []);
    expect([...s]).toEqual(["M-1"]);
  });

  it("adds umpire numbers from register rows", () => {
    const s = umpireIdKeysFromRegister("M-1", [
      { umpireNumber: "U42" },
      { umpireNumber: "  " },
      { umpireNumber: 99 as unknown as string },
    ]);
    expect(s.has("M-1")).toBe(true);
    expect(s.has("U42")).toBe(true);
    expect(s.size).toBe(2);
  });
});

describe("flattenAssignmentsFromFixtures", () => {
  it("returns rows only for slots whose umpireId is in idSet", () => {
    const fixtures = [
      {
        fixtureId: "f1",
        seasonCompetitionId: "sc1",
        owningAssociationId: "a1",
        round: 2,
        scheduledStart: "2026-05-01T10:00:00.000Z",
        venueName: "Park",
        umpires: [
          { umpireType: "Field", umpireId: "OTHER", allocationStatus: "assigned" },
          { umpireType: "Reserve", umpireId: "M-1", isStandby: true },
        ],
      },
    ];
    const idSet = new Set(["M-1"]);
    const rows = flattenAssignmentsFromFixtures(fixtures, idSet);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      fixtureId: "f1",
      seasonCompetitionId: "sc1",
      slotIndex: 1,
      umpireId: "M-1",
      umpireType: "Reserve",
      isStandby: true,
    });
  });
});

describe("mergeUmpireSlotAllocationStatus", () => {
  it("sets accepted timestamps and clears declined", () => {
    const out = mergeUmpireSlotAllocationStatus(
      { umpireId: "x", umpireType: "Field", dateDeclined: "old" },
      "accepted",
      "2026-01-01T00:00:00.000Z",
    );
    expect(out.allocationStatus).toBe("accepted");
    expect(out.dateAccepted).toBe("2026-01-01T00:00:00.000Z");
    expect(out.dateDeclined).toBeNull();
    expect(out.dateUpdated).toBe("2026-01-01T00:00:00.000Z");
  });

  it("sets declined timestamps and clears accepted", () => {
    const out = mergeUmpireSlotAllocationStatus(
      { umpireId: "x", dateAccepted: "old" },
      "declined",
      "2026-02-02T00:00:00.000Z",
    );
    expect(out.allocationStatus).toBe("declined");
    expect(out.dateDeclined).toBe("2026-02-02T00:00:00.000Z");
    expect(out.dateAccepted).toBeNull();
  });
});
