import { describe, expect, it } from "vitest";
import { csvEscapeField, toCsvRow } from "@/lib/utils/csvEscape";

describe("csvEscapeField", () => {
  it("wraps fields with commas and quotes", () => {
    expect(csvEscapeField(`a"b,c`)).toBe(`"a""b,c"`);
  });

  it("escapes newlines", () => {
    expect(csvEscapeField("x\ny")).toBe(`"x\ny"`);
  });
});

describe("toCsvRow", () => {
  it("joins with commas and CRLF", () => {
    expect(toCsvRow(["a", "b"])).toBe("a,b\r\n");
  });
});
