import { describe, expect, it } from "vitest";
import { sponsorGroups, associationOnlyGroups } from "@/lib/sponsors/groups";

const assoc = (id: string, parent: string | undefined, partners: unknown[] | undefined, name = id) => ({ associationId: id, name, parentAssociationId: parent, branding: partners ? { partners } : {} });
const map = (...a: any[]) => new Map(a.map((x) => [x.associationId, x]));

describe("sponsorGroups", () => {
  const club = { id: "c1", name: "Commercial", parentAssociationId: "bha", publicPartners: [{ name: "Joe's Pies", logoUrl: "https://x/p.png" }] };
  const assocs = map(
    assoc("bha", "hq", [{ name: "BHA Sponsor" }], "Brisbane HA"),
    assoc("hq", "ha", [{ name: "HQ Sponsor" }], "Hockey Queensland"),
    assoc("ha", undefined, undefined, "Hockey Australia"),
  );

  it("lists the club first, then each association above it with partners, nearest first", () => {
    const g = sponsorGroups(club, assocs);
    expect(g.map((x) => x.label)).toEqual(["Commercial", "Brisbane HA", "Hockey Queensland"]);
    expect(g[0]).toMatchObject({ scopeType: "club", scopeId: "c1" });
    expect(g[1]).toMatchObject({ scopeType: "association", scopeId: "bha" });
  });

  it("skips levels with no partners and clubs with none", () => {
    expect(sponsorGroups({ ...club, publicPartners: [] }, assocs).map((x) => x.label)).toEqual(["Brisbane HA", "Hockey Queensland"]);
    expect(sponsorGroups(null, assocs)).toEqual([]);
  });

  it("stops at a loop in the association chain", () => {
    const loop = map(assoc("a", "b", [{ name: "A" }]), assoc("b", "a", [{ name: "B" }]));
    expect(sponsorGroups({ name: "C", parentAssociationId: "a" }, loop).map((x) => x.scopeId)).toEqual(["a", "b"]);
  });

  it("starts at the association for someone with no club", () => {
    expect(associationOnlyGroups({ associationId: "hq" }, assocs).map((x) => x.scopeId)).toEqual(["hq"]);
  });
});
