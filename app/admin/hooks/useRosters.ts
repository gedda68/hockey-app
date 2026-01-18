// app/admin/hooks/useRosters.ts

import { useState, useEffect } from "react";
import { Roster } from "../types";

export function useRosters() {
  const [rosters, setRosters] = useState<Roster[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRosters = async () => {
    try {
      console.log("=== FETCHING ROSTERS ===");
      setRefreshing(true);

      const timestamp = Date.now();
      const response = await fetch(`/api/admin/rosters?t=${timestamp}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache, no-store, must-revalidate" },
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      console.log("✅ Fetched:", data.length, "rosters");

      setRosters(data);
      setLoading(false);
      setRefreshing(false);
    } catch (error) {
      console.error("❌ Error:", error);
      setLoading(false);
      setRefreshing(false);
      alert("Failed to fetch rosters");
    }
  };

  useEffect(() => {
    fetchRosters();
  }, []);

  return {
    rosters,
    loading,
    refreshing,
    fetchRosters,
  };
}
