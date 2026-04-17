import { describe, expect, it } from "vitest";
import {
  ancestorAssociationIdsForClubFlowdown,
  ancestorAssociationIdsForFlowdown,
} from "@/lib/data/newsFlowdown";

describe("newsFlowdown ordering", () => {
  it("reverses association hierarchy root → parent into parent → root", () => {
    expect(ancestorAssociationIdsForFlowdown(["HQ", "ST", "R"])).toEqual(["R", "ST", "HQ"]);
  });

  it("club chain starts at canonical parent then parent’s ancestors toward root", () => {
    expect(ancestorAssociationIdsForClubFlowdown("R", ["HQ", "ST"])).toEqual(["R", "ST", "HQ"]);
  });

  it("handles empty hierarchy for club", () => {
    expect(ancestorAssociationIdsForClubFlowdown("HQ", [])).toEqual(["HQ"]);
  });
});
