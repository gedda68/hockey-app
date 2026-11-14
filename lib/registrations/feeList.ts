// Registration fee lists. Each club and association keeps its own list in `fees[]` on its document
// (edited by its administrator on /admin/fees). The registration flow stacks the lists:
//   - association fees are inherited automatically (every association above the club),
//   - club fees are chosen by the member while registering (`chosenByMember`).
// starterFees() gives each level a starting list from CATEGORY_FEE until administrators edit it.

import { CATEGORY_FEE, CATEGORY_LABEL, type RegistrationCategory } from "./categories";

export interface FeeEntry {
  feeId: string;
  name: string;
  description?: string;
  amount: number;
  gstIncluded: boolean;
  isActive: boolean;
  appliesTo: { ageCategories: string[] };
  /** true on association fees: added to every registration automatically. */
  inherited?: boolean;
  /** true on club fees: shown to the registering member to choose. */
  chosenByMember?: boolean;
  validFrom?: string;
  validTo?: string;
  source?: string;
}

export type OwnerType = "club" | "association";

const CATEGORIES: RegistrationCategory[] = ["junior", "senior", "other", "volunteer"];

export function starterFees(ownerType: OwnerType, ownerName: string): FeeEntry[] {
  return CATEGORIES
    // Volunteers are registered at club level only.
    .filter((c) => !(c === "volunteer" && ownerType === "association"))
    .map((c) => ({
      feeId: `std-${c}`,
      name: `${CATEGORY_LABEL[c]} registration`,
      description: `${ownerName} ${CATEGORY_LABEL[c].toLowerCase()} registration`,
      amount: CATEGORY_FEE[c],
      gstIncluded: true,
      isActive: true,
      appliesTo: { ageCategories: [c] },
      ...(ownerType === "association" ? { inherited: true } : { chosenByMember: true }),
      source: "starter",
    }));
}

/** Active fees on a list that apply to the category and today's date. */
export function applicableFees(list: unknown, category: string, on = new Date()): FeeEntry[] {
  if (!Array.isArray(list)) return [];
  return (list as FeeEntry[]).filter((f) => {
    if (!f || f.isActive === false) return false;
    const cats = f.appliesTo?.ageCategories;
    if (Array.isArray(cats) && cats.length && !cats.includes(category)) return false;
    if (f.validFrom && new Date(f.validFrom) > on) return false;
    if (f.validTo && new Date(f.validTo) < on) return false;
    return true;
  });
}
