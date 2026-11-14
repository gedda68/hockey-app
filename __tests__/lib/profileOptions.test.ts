import { describe, it, expect } from "vitest";
import { mergeOptions, resolveSelection, namesToOptions } from "@/lib/members/profileOptions";

describe("profileOptions", () => {
  it("uses configured rows (id value, name label), de-duplicated by name", () => {
    expect(mergeOptions([{ id: "sal-mr", name: "Mr" }, { id: "x", name: "mr" }, { name: " Dr " }, { id: "e", name: "" }], ["X"])).toEqual([
      { value: "sal-mr", label: "Mr" },
      { value: "Dr", label: "Dr" },
    ]);
  });
  it("falls back to defaults when nothing is configured", () => {
    expect(mergeOptions([], ["A", "B"])).toEqual(namesToOptions(["A", "B"]));
  });
  it("selects by id, by name, or keeps an unknown stored value", () => {
    const opts = [{ value: "sal-mr", label: "Mr" }];
    expect(resolveSelection(opts, "sal-mr").value).toBe("sal-mr");
    expect(resolveSelection(opts, "mr").value).toBe("sal-mr");
    const r = resolveSelection(opts, "Agender");
    expect(r.value).toBe("Agender");
    expect(r.options[0].label).toBe("Agender");
  });
});
