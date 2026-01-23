// app/admin/components/ActionBar.tsx
import { useState, useEffect } from "react";
import { Calendar, Search } from "lucide-react";

interface ActionBarProps {
  refreshing: boolean;
  rostersCount: number;
  currentSeason: string; // New prop
  onSeasonChange: (season: string) => void; // New prop
  onRefresh: () => void;
  onAddDivision: () => void;
  onBulkUpload: () => void;
}

export default function ActionBar({
  refreshing,
  rostersCount,
  currentSeason,
  onSeasonChange,
  onRefresh,
  onAddDivision,
  onBulkUpload,
}: ActionBarProps) {
  const [seasonsList, setSeasonsList] = useState<string[]>([]);

  // Fetch available seasons for the type-ahead suggestions
  useEffect(() => {
    async function fetchSeasons() {
      try {
        // This endpoint returns distinct lists of everything in the DB
        const res = await fetch("/api/admin/metadata");
        const data = await res.json();

        if (data.seasons && data.seasons.length > 0) {
          setSeasonsList(data.seasons);
        } else {
          // Fallback to current year if DB is empty
          setSeasonsList([new Date().getFullYear().toString()]);
        }
      } catch (err) {
        console.error("Failed to load seasons", err);
      }
    }
    fetchSeasons();
  }, []);

  return (
    <div className="bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex gap-4 items-center flex-wrap">
          {/* SEASON SEARCH / TYPE-AHEAD */}
          <div className="relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#06054e] transition-colors">
              <Calendar size={16} />
            </div>
            <input
              list="action-bar-seasons"
              type="text"
              value={currentSeason}
              onChange={(e) => onSeasonChange(e.target.value)}
              placeholder="Search Season..."
              className="pl-11 pr-4 py-3 bg-slate-100 border-2 border-transparent focus:border-[#06054e] focus:bg-white rounded-full font-black uppercase text-xs outline-none transition-all w-48"
              autoComplete="off"
            />
            <datalist id="action-bar-seasons">
              {seasonsList.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>

          <button
            onClick={onAddDivision}
            className="px-6 py-3 bg-green-600 text-white rounded-full font-black uppercase text-sm hover:bg-green-700 transition-all"
          >
            + Add Division
          </button>

          <button
            onClick={onBulkUpload}
            className="px-6 py-3 bg-blue-600 text-white rounded-full font-black uppercase text-sm hover:bg-blue-700 transition-all"
          >
            📊 Bulk Upload
          </button>

          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="px-6 py-3 bg-slate-600 text-white rounded-full font-black uppercase text-sm hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {refreshing ? "🔄 Refreshing..." : "🔄 Refresh"}
          </button>

          <div className="flex-1"></div>

          <div className="px-4 py-2 bg-blue-50 border border-blue-100 rounded-full">
            <span className="text-[10px] font-black uppercase text-blue-900 flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
              {rostersCount} {rostersCount === 1 ? "division" : "divisions"} in{" "}
              {currentSeason}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
