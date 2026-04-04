import { describe, it, expect } from "vitest";
import { escapeRegex } from "@/lib/utils/regex";

describe("escapeRegex", () => {
  it("returns the string unchanged when no special chars are present", () => {
    expect(escapeRegex("hello world")).toBe("hello world");
    expect(escapeRegex("JohnSmith123")).toBe("JohnSmith123");
  });

  it("escapes a literal dot", () => {
    expect(escapeRegex("john.smith")).toBe("john\\.smith");
  });

  it("escapes a plus sign", () => {
    expect(escapeRegex("a+b")).toBe("a\\+b");
  });

  it("escapes parentheses", () => {
    expect(escapeRegex("(Brisbane)")).toBe("\\(Brisbane\\)");
  });

  it("escapes square brackets but leaves hyphen unescaped (not in charset)", () => {
    // hyphen (-) is not in the escapeRegex charset, so it is left as-is
    expect(escapeRegex("[A-Z]")).toBe("\\[A-Z\\]");
  });

  it("escapes curly braces", () => {
    expect(escapeRegex("{3}")).toBe("\\{3\\}");
  });

  it("escapes caret and dollar", () => {
    expect(escapeRegex("^start$")).toBe("\\^start\\$");
  });

  it("escapes pipe and question mark", () => {
    expect(escapeRegex("yes|no?")).toBe("yes\\|no\\?");
  });

  it("escapes backslash", () => {
    expect(escapeRegex("C:\\Users")).toBe("C:\\\\Users");
  });

  it("escapes a ReDoS-style attack pattern", () => {
    const malicious = "((a+)+)$";
    const escaped = escapeRegex(malicious);
    // The output should not contain unescaped (, +, ), $
    expect(escaped).toBe("\\(\\(a\\+\\)\\+\\)\\$");
  });

  it("handles an empty string", () => {
    expect(escapeRegex("")).toBe("");
  });

  it("escapes all special MongoDB regex chars in one string", () => {
    const input = ".*+?^${}()|[]\\";
    const escaped = escapeRegex(input);
    // Every special char should be preceded by a backslash
    expect(escaped).toBe("\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\");
  });
});
