"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

export default function RefreshButton() {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true); // Default to ON

  const handleRefresh = () => {
    setIsRefreshing(true);
    router.refresh();
    setTimeout(() => setIsRefreshing(false), 800);
  };

  // Auto-refresh logic
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (autoRefresh) {
      interval = setInterval(() => {
        handleRefresh();
        console.log("Live scores auto-synced");
      }, 30000); // Refresh every 30 seconds
    }

    return () => clearInterval(interval);
  }, [autoRefresh]);

  return (
    <div className="flex items-center gap-4">
      {/* Auto-Refresh Toggle */}
      <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-1.5 rounded-full">
        <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest">
          Auto-Sync
        </span>
        <button
          onClick={() => setAutoRefresh(!autoRefresh)}
          className={`w-8 h-4 rounded-full transition-colors relative ${
            autoRefresh ? "bg-green-500" : "bg-slate-300"
          }`}
        >
          <div
            className={`absolute top-1 w-2 h-2 bg-white rounded-full transition-all ${
              autoRefresh ? "left-5" : "left-1"
            }`}
          />
        </button>
      </div>

      {/* Manual Refresh Button */}
      <button
        onClick={handleRefresh}
        disabled={isRefreshing}
        className="flex items-center gap-2 px-4 py-2 bg-[#06054e] text-white rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all disabled:opacity-50 shadow-lg shadow-blue-900/10"
      >
        <span
          className={`inline-block transition-transform duration-700 ${
            isRefreshing ? "rotate-180" : ""
          }`}
        >
          🔄
        </span>
        {isRefreshing ? "Updating..." : "Sync Now"}
      </button>
    </div>
  );
}
