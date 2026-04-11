// Fee stack: layers (association → club → competition → tournament → insurance → levy/other),
// default collector per layer, and collection sort order for remittance / display.

import type { FeeLineItem, FeeStackLayer } from "@/types/registration";

/** Display / remittance order: wider jurisdiction first, then club, events, insurance, other. */
export const FEE_COLLECTION_LAYER_ORDER: Record<FeeStackLayer, number> = {
  association: 10,
  club: 20,
  competition: 30,
  tournament: 40,
  insurance: 50,
  levy: 60,
  other: 70,
};

export function mapFeeTypeToStackLayer(type: FeeLineItem["type"]): FeeStackLayer {
  switch (type) {
    case "association":
      return "association";
    case "club":
      return "club";
    case "competition":
      return "competition";
    case "tournament":
      return "tournament";
    case "insurance":
      return "insurance";
    case "levy":
      return "levy";
    default:
      return "other";
  }
}

export function defaultCollectedByForLayer(layer: FeeStackLayer): string {
  const m: Record<FeeStackLayer, string> = {
    association: "association",
    club: "club",
    competition: "competition_organiser",
    tournament: "tournament_organiser",
    insurance: "insurer",
    levy: "collecting_body",
    other: "collecting_body",
  };
  return m[layer];
}

function layerOf(item: FeeLineItem): FeeStackLayer {
  return item.stackLayer ?? mapFeeTypeToStackLayer(item.type);
}

/**
 * Normalises stack metadata and assigns `collectionSequence` (1-based) in collection order:
 * association fees by `associationHierarchyLevel` ascending (national toward regional),
 * then club, competition, tournament, insurance, levy, other; stable tie-break on itemId.
 */
export function finalizeFeeLineItemsForRegistration(
  items: FeeLineItem[],
): FeeLineItem[] {
  const enriched = items.map((item) => {
    const stackLayer = layerOf(item);
    return {
      ...item,
      stackLayer,
      collectedBy:
        item.collectedBy ?? defaultCollectedByForLayer(stackLayer),
    };
  });

  enriched.sort((a, b) => {
    const la = layerOf(a);
    const lb = layerOf(b);
    const oa = FEE_COLLECTION_LAYER_ORDER[la];
    const ob = FEE_COLLECTION_LAYER_ORDER[lb];
    if (oa !== ob) return oa - ob;

    if (la === "association" && lb === "association") {
      const al = a.associationHierarchyLevel;
      const bl = b.associationHierarchyLevel;
      if (al != null && bl != null && al !== bl) return al - bl;
      if (al != null && bl == null) return -1;
      if (al == null && bl != null) return 1;
      const aid = a.associationId ?? "";
      const bid = b.associationId ?? "";
      if (aid !== bid) return aid.localeCompare(bid);
    }

    return a.itemId.localeCompare(b.itemId);
  });

  return enriched.map((item, i) => ({
    ...item,
    collectionSequence: i + 1,
  }));
}

export const DEFAULT_FEE_STACK_POLICY_ID = "jurisdiction_club_events_insurance_other";

export function feeStackPolicySummary() {
  return {
    policyId: DEFAULT_FEE_STACK_POLICY_ID,
    description:
      "Association hierarchy (by level, national first), then club, competition, tournament, insurance, levy, other.",
    layerOrder: Object.entries(FEE_COLLECTION_LAYER_ORDER)
      .sort(([, a], [, b]) => a - b)
      .map(([layer]) => layer as FeeStackLayer),
  };
}
