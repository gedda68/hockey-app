import { describe, it, expect } from "vitest";
import { nationalAssociations, childAssociations, clubsUnder, selectionForClub } from "@/lib/members/associationHierarchy";

const assoc = [
  { associationId: "ha", name: "Hockey Australia" },
  { associationId: "hq", name: "Hockey Queensland", parentAssociationId: "ha" },
  { associationId: "hnsw", name: "Hockey NSW", parentAssociationId: "ha" },
  { associationId: "bhl", name: "Brisbane Hockey League", parentAssociationId: "hq" },
  { associationId: "x", name: "Empty parent", parentAssociationId: "" },
];
const clubs = [
  { id: "chc", name: "Commercial HC", parentAssociationId: "bhl" },
  { id: "other", name: "Other", parentAssociationId: "hnsw" },
];

describe("association hierarchy", () => {
  it("top level has no parent", () => {
    expect(nationalAssociations(assoc).map((a) => a.associationId)).toEqual(["x", "ha"]);
  });
  it("children are by parent link", () => {
    expect(childAssociations(assoc, "ha").map((a) => a.associationId)).toEqual(["hnsw", "hq"]);
    expect(childAssociations(assoc, "")).toEqual([]);
  });
  it("clubs come from the chosen association", () => {
    expect(clubsUnder(clubs, "bhl").map((c) => c.id)).toEqual(["chc"]);
  });
  it("prefills every level for an existing club", () => {
    expect(selectionForClub(assoc, clubs, "chc")).toEqual({ national: "ha", state: "hq", city: "bhl", club: "chc" });
    expect(selectionForClub(assoc, clubs, "other")).toEqual({ national: "ha", state: "hnsw", city: "", club: "other" });
    expect(selectionForClub(assoc, clubs, "nope").club).toBe("");
  });
});
