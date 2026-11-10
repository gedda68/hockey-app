import { describe, expect, it } from "vitest";
import {
  applyLeagueFilters,
  buildFilterOptions,
  hasActiveFilters,
  leaguesHref,
  leaguesHrefWith,
  parseLeagueFilters,
  type FilterableLeague,
} from "@/lib/public/leagueFilters";

const row = (
  season: string,
  state: string | null,
  country: string | null = "Australia",
  sport: string | null = "hockey",
): FilterableLeague => ({ season, state, country, sport });

const rows: FilterableLeague[] = [
  row("2026", "QLD"),
  row("2026", "NSW"),
  row("2025", "QLD"),
  row("2025", "QLD", "Australia", "indoor hockey"),
  row("2026", "Auckland", "New Zealand"),
  row("2026", null, null, null), // competition with no geography/sport set
];

describe("parseLeagueFilters", () => {
  it("reads known keys and trims", () => {
    expect(parseLeagueFilters({ season: " 2026 ", state: "QLD", junk: "x" })).toEqual({
      season: "2026",
      state: "QLD",
    });
  });

  it("takes the first of a repeated param and ignores empty / non-string values", () => {
    expect(parseLeagueFilters({ season: ["2025", "2026"], state: "", country: undefined })).toEqual({
      season: "2025",
    });
  });

  it("drops absurdly long values", () => {
    expect(parseLeagueFilters({ state: "x".repeat(500) })).toEqual({});
  });
});

describe("applyLeagueFilters", () => {
  it("returns everything with no filters", () => {
    expect(applyLeagueFilters(rows, {})).toHaveLength(rows.length);
  });

  it("ANDs filters across facets", () => {
    const out = applyLeagueFilters(rows, { season: "2025", state: "QLD" });
    expect(out).toHaveLength(2);
  });

  it("matches case-insensitively and ignores surrounding whitespace", () => {
    expect(applyLeagueFilters(rows, { state: "qld" })).toHaveLength(3);
    expect(applyLeagueFilters([row("2026", "  QLD  ")], { state: "QLD" })).toHaveLength(1);
  });

  it("excludes leagues that have no value for an active facet", () => {
    const out = applyLeagueFilters(rows, { country: "Australia" });
    expect(out.every((r) => r.country === "Australia")).toBe(true);
    expect(out).toHaveLength(4);
  });
});

describe("buildFilterOptions", () => {
  it("counts each facet against the other active filters only", () => {
    const o = buildFilterOptions(rows, { state: "QLD" });
    // season is faceted by state=QLD (3 rows): 2026 x1, 2025 x2
    expect(o.season).toEqual([
      { value: "2026", count: 1 },
      { value: "2025", count: 2 },
    ]);
    // state itself ignores its own filter, so you can see the alternatives
    expect(o.state.map((x) => x.value)).toEqual(["Auckland", "NSW", "QLD"]);
  });

  it("sorts seasons newest first and other facets alphabetically", () => {
    const o = buildFilterOptions(rows, {});
    expect(o.season.map((x) => x.value)).toEqual(["2026", "2025"]);
    expect(o.country.map((x) => x.value)).toEqual(["Australia", "New Zealand"]);
  });

  it("does not offer values from leagues that have none", () => {
    const o = buildFilterOptions([row("2026", null, null, null)], {});
    expect(o.state).toEqual([]);
    expect(o.country).toEqual([]);
  });

  it("de-duplicates values case-insensitively, keeping the first spelling", () => {
    const o = buildFilterOptions([row("2026", "QLD"), row("2026", "qld")], {});
    expect(o.state).toEqual([{ value: "QLD", count: 2 }]);
  });

  it("keeps a selected value that has no matches so it can be cleared", () => {
    const o = buildFilterOptions(rows, { state: "TAS" });
    expect(o.state).toContainEqual({ value: "TAS", count: 0 });
  });
});

describe("hrefs", () => {
  it("builds a stable canonical URL", () => {
    expect(leaguesHref({})).toBe("/competitions/leagues");
    expect(leaguesHref({ state: "QLD", season: "2026" })).toBe(
      "/competitions/leagues?season=2026&state=QLD",
    );
  });

  it("encodes values", () => {
    expect(leaguesHref({ sport: "indoor hockey" })).toBe("/competitions/leagues?sport=indoor+hockey");
  });

  it("sets and clears a single facet while keeping the others", () => {
    expect(leaguesHrefWith({ season: "2026" }, "state", "QLD")).toBe(
      "/competitions/leagues?season=2026&state=QLD",
    );
    expect(leaguesHrefWith({ season: "2026", state: "QLD" }, "state", null)).toBe(
      "/competitions/leagues?season=2026",
    );
  });

  it("hasActiveFilters reflects any set facet", () => {
    expect(hasActiveFilters({})).toBe(false);
    expect(hasActiveFilters({ sport: "hockey" })).toBe(true);
  });
});
