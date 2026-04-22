import { useState, useEffect, useCallback, useRef } from "react";
import { Roster } from "../types";

export function useRosters(selectedYear: string) {
  const [rosters, setRosters] = useState<Roster[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Track whether we already have data so fetchRosters can decide which
  // loading state to show without adding rosters.length to useCallback deps
  // (which would cause an infinite fetch loop via the useEffect below).
  const hasDataRef = useRef(false);

  const fetchRosters = useCallback(async () => {
    try {
      // Logic: If we already have data, show the subtle 'refreshing' spinner
      // If we have no data (changing years), show the full-page 'loading' state
      if (!hasDataRef.current) setLoading(true);
      setRefreshing(true);

      console.log(`=== FETCHING ROSTERS FOR SEASON: ${selectedYear} ===`);

      const timestamp = Date.now();
      // Added the 'year' parameter to the API call
      const response = await fetch(
        `/api/admin/rosters?year=${selectedYear}&t=${timestamp}`,
        {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache, no-store, must-revalidate" },
        }
      );

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();

      // Ensure we extract the array correctly.
      // If your API returns { rosters: [...] }, use data.rosters
      const rosterData = Array.isArray(data) ? data : data.rosters || [];

      console.log(
        `✅ Fetched: ${rosterData.length} rosters for ${selectedYear}`
      );

      hasDataRef.current = true;
      setRosters(rosterData);
    } catch (error) {
      console.error("❌ Error:", error);
      // We don't alert here to avoid spamming the user during typing
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedYear]); // Re-memoize function when year changes

  // Reset the "has data" flag whenever the year changes so the full loading
  // spinner is shown again (not just the subtle refreshing indicator).
  useEffect(() => {
    hasDataRef.current = false;
  }, [selectedYear]);

  // Trigger fetch on initial load and whenever fetchRosters is re-memoized
  // (i.e. when selectedYear changes).
  useEffect(() => {
    void fetchRosters();
  }, [fetchRosters]);

  return {
    rosters,
    loading,
    refreshing,
    fetchRosters,
  };
}
