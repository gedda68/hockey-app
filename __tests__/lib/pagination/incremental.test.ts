import { describe, expect, it } from "vitest";
import {
  DEFAULT_PAGE_SIZE,
  clampVisible,
  nextVisibleCount,
  sanitizePageSize,
} from "@/lib/pagination/incremental";

describe("sanitizePageSize", () => {
  it("keeps valid sizes and floors fractions", () => {
    expect(sanitizePageSize(5)).toBe(5);
    expect(sanitizePageSize(5.9)).toBe(5);
  });
  it("falls back for zero, negative, NaN and undefined", () => {
    for (const bad of [0, -3, NaN, Infinity * 0, undefined]) {
      expect(sanitizePageSize(bad as number | undefined)).toBe(DEFAULT_PAGE_SIZE);
    }
  });
});

describe("nextVisibleCount", () => {
  it("adds one page", () => expect(nextVisibleCount(12, 100, 12)).toBe(24));
  it("never exceeds the total", () => expect(nextVisibleCount(24, 30, 12)).toBe(30));
  it("is stable once everything is shown", () => expect(nextVisibleCount(30, 30, 12)).toBe(30));
  it("handles an empty list", () => expect(nextVisibleCount(0, 0, 12)).toBe(0));
});

describe("clampVisible", () => {
  it("shows at least one page when there is enough data", () =>
    expect(clampVisible(0, 50, 12)).toBe(12));
  it("shows everything for a short list", () => expect(clampVisible(12, 5, 12)).toBe(5));
  it("shrinks when the list shrinks after filtering", () =>
    expect(clampVisible(48, 7, 12)).toBe(7));
});
