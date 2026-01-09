"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";

interface FilterOptions {
  [key: string]: string | null;
}

/**
 * useFilters Hook
 *
 * Manages URL-based filter state for consistent filtering across pages.
 * Automatically syncs filters with URL search params.
 *
 * @example
 * const { filters, updateFilter, updateFilters, resetFilters } = useFilters({
 *   div: 'All',
 *   year: '2025',
 *   status: 'All',
 * });
 *
 * // Update single filter
 * updateFilter('div', 'BHL1');
 *
 * // Update multiple filters
 * updateFilters({ div: 'BHL1', year: '2026' });
 *
 * // Reset to defaults
 * resetFilters();
 */
export function useFilters(defaults: FilterOptions = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Get current filter values from URL or defaults
  const filters = Object.keys(defaults).reduce((acc, key) => {
    acc[key] = searchParams.get(key) || defaults[key];
    return acc;
  }, {} as FilterOptions);

  // Update a single filter
  const updateFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());

      if (value && value !== defaults[key]) {
        params.set(key, value);
      } else {
        params.delete(key);
      }

      router.push(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams, defaults]
  );

  // Update multiple filters at once
  const updateFilters = useCallback(
    (newFilters: FilterOptions) => {
      const params = new URLSearchParams(searchParams.toString());

      Object.entries(newFilters).forEach(([key, value]) => {
        if (value && value !== defaults[key]) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      });

      router.push(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams, defaults]
  );

  // Reset all filters to defaults
  const resetFilters = useCallback(() => {
    router.push(pathname);
  }, [pathname, router]);

  // Get filter as specific type
  const getFilter = <T>(
    key: string,
    transform?: (value: string) => T
  ): T | string | null => {
    const value = filters[key];
    if (transform && value) {
      return transform(value);
    }
    return value;
  };

  return {
    filters,
    updateFilter,
    updateFilters,
    resetFilters,
    getFilter,
  };
}

// Helper hook for common filter patterns
export function useMatchFilters() {
  return useFilters({
    view: "results",
    div: "All",
    round: "All",
    status: "All",
    year: new Date().getFullYear().toString(),
  });
}

export function useStandingsFilters() {
  return useFilters({
    div: "BHL1",
    year: new Date().getFullYear().toString(),
  });
}

export function useStatisticsFilters() {
  return useFilters({
    div: "BHL1",
    year: new Date().getFullYear().toString(),
    category: "players",
  });
}
