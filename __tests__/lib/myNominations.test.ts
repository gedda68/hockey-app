import { describe, expect, it } from "vitest";
import { splitNominations, statusLabel } from "@/lib/nominations/myNominations";

const IDS = ["MBR-1", "hex1"];
const row = (o: Record<string, unknown>) => ({ nominationId: "n", season: "2026", ageGroup: "U16", status: "pending", nominatedAt: "2026-05-01T00:00:00Z", ...o });

describe("splitNominations", () => {
  it("separates nominations about me from ones I made for others", () => {
    const { aboutMe, madeByMe } = splitNominations([
      row({ nominationId: "a", memberId: "MBR-1" }),
      row({ nominationId: "b", nomineeId: "hex1", nominatedBy: "MBR-9", nominatedByName: "Coach Kim" }),
      row({ nominationId: "c", nomineeId: "MBR-7", nomineeName: "Sam", nominatedBy: "MBR-1" }),
      row({ nominationId: "d", nomineeId: "MBR-8", nominatedBy: "MBR-5" }),
    ], IDS);
    expect(aboutMe.map((n) => n.nominationId).sort()).toEqual(["a", "b"]);
    expect(madeByMe.map((n) => n.nominationId)).toEqual(["c"]);
  });

  it("says who nominated: self, or the named person", () => {
    const { aboutMe } = splitNominations([row({ nominationId: "a", memberId: "MBR-1" }), row({ nominationId: "b", nomineeId: "hex1", nominatedBy: "MBR-9", nominatedByName: "Coach Kim" })], IDS);
    expect(aboutMe.find((n) => n.nominationId === "a")!.nominatedBy).toBe("self");
    expect(aboutMe.find((n) => n.nominationId === "b")!.nominatedBy).toEqual({ name: "Coach Kim" });
  });

  it("labels staff positions and statuses plainly, and attaches the tournament title", () => {
    const { aboutMe } = splitNominations([row({ memberId: "MBR-1", role: "head-coach", status: "accepted" })], IDS, new Map([["2026||U16", "State Champs"]]));
    expect(aboutMe[0].position).toBe("Head coach");
    expect(aboutMe[0].statusLabel).toBe("Selected");
    expect(aboutMe[0].tournamentTitle).toBe("State Champs");
    expect(statusLabel("pending")).toBe("Under review");
  });

  it("ignores rows that don't involve the person and tolerates no identifiers", () => {
    expect(splitNominations([row({ memberId: "MBR-2" })], IDS)).toEqual({ aboutMe: [], madeByMe: [] });
    expect(splitNominations([row({ memberId: "MBR-1" })], [])).toEqual({ aboutMe: [], madeByMe: [] });
  });
});
