import { describe, it, expect } from "vitest";
import { mergeOptions, withCurrent } from "@/lib/members/profileOptions";

describe("profileOptions", () => {
  it("uses configured names, de-duplicated", () => {
    expect(mergeOptions(["Mr", "mr", " Dr ", ""], ["X"])).toEqual(["Mr", "Dr"]);
  });
  it("falls back to defaults when nothing is configured", () => {
    expect(mergeOptions([], ["A", "B"])).toEqual(["A", "B"]);
  });
  it("keeps a stored value that is not in the list", () => {
    expect(withCurrent(["Male"], "Agender")).toEqual(["Agender", "Male"]);
    expect(withCurrent(["Male"], "male")).toEqual(["Male"]);
  });
});
