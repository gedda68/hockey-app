import { describe, it, expect } from "vitest";
import { generateSlug } from "@/lib/utils/slug";

describe("generateSlug", () => {
  it("converts a simple club name to a slug", () => {
    expect(generateSlug("Commercial Hockey Club")).toBe("commercial-hockey-club");
  });

  it("lowercases the entire string", () => {
    expect(generateSlug("BRISBANE HOCKEY")).toBe("brisbane-hockey");
  });

  it("collapses multiple spaces into a single hyphen", () => {
    expect(generateSlug("Gold  Coast  Hawks")).toBe("gold-coast-hawks");
  });

  it("removes special characters", () => {
    expect(generateSlug("St. Mary's HC")).toBe("st-marys-hc");
  });

  it("strips leading and trailing hyphens", () => {
    expect(generateSlug(" -Test Club- ")).toBe("test-club");
  });

  it("collapses consecutive hyphens", () => {
    expect(generateSlug("North--South")).toBe("north-south");
  });

  it("handles an already slug-like string", () => {
    expect(generateSlug("sunshine-coast")).toBe("sunshine-coast");
  });

  it("returns empty string for empty input", () => {
    expect(generateSlug("")).toBe("");
  });

  it("handles numbers in names", () => {
    expect(generateSlug("Under 12 Gold")).toBe("under-12-gold");
  });

  it("handles an apostrophe followed by letters", () => {
    expect(generateSlug("O'Brien HC")).toBe("obrien-hc");
  });
});
