// lib/public/leagueFilters.ts
// Filtering + faceting for the public /competitions/leagues page. Pure (no DB, no
// React) so it is unit-testable. Filters live in the URL (?season=&country=&state=&sport=)
// so every filtered view is shareable and works without client-side JavaScript.

import type { PublicLeagueRow } from "@/lib/public/publicLeagues";

export const LEAGUE_FILTER_KEYS = ["season", "country", "state", "sport"] as const;
export type LeagueFilterKey = (typeof LEAGUE_FILTER_KEYS)[number];
export type LeagueFilters = Partial<Record<LeagueFilterKey, string>>;

export type FilterableLeague = Pick<PublicLeagueRow, LeagueFilterKey>;

export type FilterOption = { value: string; count: number };

/** Longest filter value we accept from a URL. */
const MAX_VALUE_LENGTH = 80;

const norm = (s: string): string => s.trim().toLowerCase();

function rowValue(row: FilterableLeague, key: LeagueFilterKey): string | null {
  const v = row[key];
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t ? t : null;
}

/** Read filters from Next's searchParams. Takes the first value of repeated params. */
export function parseLeagueFilters(
  sp: Record<string, string | string[] | undefined>,
): LeagueFilters {
  const out: LeagueFilters = {};
  for (const key of LEAGUE_FILTER_KEYS) {
    const raw = sp[key];
    const first = Array.isArray(raw) ? raw[0] : raw;
    if (typeof first !== "string") continue;
    const v = first.trim();
    if (v && v.length <= MAX_VALUE_LENGTH) out[key] = v;
  }
  return out;
}

export function hasActiveFilters(filters: LeagueFilters): boolean {
  return LEAGUE_FILTER_KEYS.some((k) => Boolean(filters[k]));
}

function matches(
  row: FilterableLeague,
  filters: LeagueFilters,
  skip?: LeagueFilterKey,
): boolean {
  for (const key of LEAGUE_FILTER_KEYS) {
    if (key === skip) continue;
    const wanted = filters[key];
    if (!wanted) continue;
    const have = rowValue(row, key);
    // A league with no value for an active facet can't satisfy it.
    if (have === null || norm(have) !== norm(wanted)) return false;
  }
  return true;
}

export function applyLeagueFilters<T extends FilterableLeague>(
  rows: T[],
  filters: LeagueFilters,
): T[] {
  return rows.filter((r) => matches(r, filters));
}

/**
 * Options for each facet, computed from the rows that match every *other* active
 * filter — so picking "QLD" doesn't offer a country that has no QLD leagues, and a
 * facet always shows what you'd get by switching it. Values are de-duplicated
 * case-insensitively (first-seen spelling wins). The selected value is always
 * included, even at count 0, so a stale link can still be cleared.
 */
export function buildFilterOptions(
  rows: FilterableLeague[],
  filters: LeagueFilters,
): Record<LeagueFilterKey, FilterOption[]> {
  const result = {} as Record<LeagueFilterKey, FilterOption[]>;

  for (const key of LEAGUE_FILTER_KEYS) {
    const byNorm = new Map<string, FilterOption>();
    for (const row of rows) {
      if (!matches(row, filters, key)) continue;
      const v = rowValue(row, key);
      if (v === null) continue;
      const k = norm(v);
      const existing = byNorm.get(k);
      if (existing) existing.count += 1;
      else byNorm.set(k, { value: v, count: 1 });
    }

    const selected = filters[key];
    if (selected && !byNorm.has(norm(selected))) {
      byNorm.set(norm(selected), { value: selected, count: 0 });
    }

    const options = [...byNorm.values()];
    options.sort((a, b) =>
      key === "season" ? b.value.localeCompare(a.value) : a.value.localeCompare(b.value),
    );
    result[key] = options;
  }

  return result;
}

/** Canonical URL for a filter set (stable param order, empty values dropped). */
export function leaguesHref(filters: LeagueFilters): string {
  const params = new URLSearchParams();
  for (const key of LEAGUE_FILTER_KEYS) {
    const v = filters[key];
    if (v) params.set(key, v);
  }
  const qs = params.toString();
  return qs ? `/competitions/leagues?${qs}` : "/competitions/leagues";
}

/** The href that results from setting (or clearing, when value is null) one facet. */
export function leaguesHrefWith(
  filters: LeagueFilters,
  key: LeagueFilterKey,
  value: string | null,
): string {
  const next: LeagueFilters = { ...filters };
  if (value) next[key] = value;
  else delete next[key];
  return leaguesHref(next);
}
