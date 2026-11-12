import { describe, expect, it } from "vitest";
import { filterMenuForRole } from "@/app/(admin)/admin/global-config/menuConfig";

const has = (role: string) =>
  filterMenuForRole(role).some((i) => i.label === "Competition panel");

describe("Competition panel menu item", () => {
  it("shows for association competition roles and super-admin", () => {
    for (const r of ["super-admin", "association-admin", "assoc-committee", "assoc-competition"]) {
      expect(has(r)).toBe(true);
    }
  });
  it("is hidden from club roles", () => {
    expect(has("club-admin")).toBe(false);
    expect(has("player")).toBe(false);
  });
  it("is a dashboard tile (has a colour)", () => {
    const item = filterMenuForRole("association-admin").find((i) => i.label === "Competition panel");
    expect(item?.color).toBeTruthy();
  });
});
