import { describe, it, expect } from "vitest";
import { mergeOptions, resolveSelection, namesToOptions, DEFAULT_SALUTATION_ROWS } from "@/lib/members/profileOptions";

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
  it("resolves by alias (mongo _id) and shows a readable name for unknown prefixed ids", () => {
    const opts = [{ value: "reltype-mother-child", label: "Mother", aliases: ["6aef8f436b2c0d41708115f5"] }];
    expect(resolveSelection(opts, "6aef8f436b2c0d41708115f5").value).toBe("reltype-mother-child");
    expect(resolveSelection([], "sal-mr").options[0].label).toBe("Mr");
    expect(resolveSelection([], "gender-non-binary").options[0].label).toBe("Non Binary");
  });
  it("defaults carry historic ids so sal-mr resolves to Mr", () => {
    const o = mergeOptions(DEFAULT_SALUTATION_ROWS, []);
    const r = resolveSelection(o, "sal-mr");
    expect(r.options.find((x) => x.value === r.value)?.label).toBe("Mr");
  });
});
