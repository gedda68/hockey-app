import { describe, expect, it } from "vitest";
import {
  finalizeFeeLineItemsForRegistration,
  mapFeeTypeToStackLayer,
  defaultCollectedByForLayer,
} from "@/lib/fees/feeStack";
import type { FeeLineItem } from "@/types/registration";

describe("feeStack", () => {
  it("maps legacy types to stack layers", () => {
    expect(mapFeeTypeToStackLayer("association")).toBe("association");
    expect(mapFeeTypeToStackLayer("tournament")).toBe("tournament");
    expect(mapFeeTypeToStackLayer("other")).toBe("other");
  });

  it("assigns default collectors", () => {
    expect(defaultCollectedByForLayer("insurance")).toBe("insurer");
    expect(defaultCollectedByForLayer("club")).toBe("club");
  });

  it("orders association fees by hierarchy level then club and insurance", () => {
    const items: FeeLineItem[] = [
      {
        itemId: "c",
        feeId: "f1",
        type: "club",
        name: "Club",
        amount: 10,
        gstIncluded: true,
        clubId: "CL1",
      },
      {
        itemId: "a2",
        feeId: "f2",
        type: "association",
        name: "Regional",
        amount: 5,
        gstIncluded: true,
        associationId: "R1",
        associationHierarchyLevel: 2,
      },
      {
        itemId: "a0",
        feeId: "f3",
        type: "association",
        name: "National",
        amount: 8,
        gstIncluded: true,
        associationId: "N1",
        associationHierarchyLevel: 0,
      },
      {
        itemId: "i",
        feeId: "f4",
        type: "insurance",
        name: "Ins",
        amount: 3,
        gstIncluded: false,
      },
    ];

    const out = finalizeFeeLineItemsForRegistration(items);
    expect(out.map((x) => x.itemId)).toEqual(["a0", "a2", "c", "i"]);
    expect(out.map((x) => x.collectionSequence)).toEqual([1, 2, 3, 4]);
    expect(out[0].collectedBy).toBe("association");
    expect(out[2].collectedBy).toBe("club");
  });
});
