// components/admin/teams/components/ActionBar.tsx
// Action bar with season and club filters

import { RefreshCw, Plus, Building2 } from "lucide-react";

interface ActionBarProps {
  refreshing: boolean;
  rostersCount: number;
  currentSeason: string;
  selectedClub: string;
  clubs: Array<{ clubId: string; name: string }>;
  userAccess: { clubId: string | null; isSuperAdmin: boolean } | null; // ✅ NEW
  onSeasonChange: (season: string) => void;
  onClubChange: (clubId: string) => void;
  onRefresh: () => void;
  onAddRoster: () => void;
}

export default function ActionBar({
  refreshing,
  rostersCount,
  currentSeason,
  selectedClub,
  clubs,
  userAccess, // ✅ NEW
  onSeasonChange,
  onClubChange,
  onRefresh,
  onAddRoster,
}: ActionBarProps) {
  const currentYear = new Date().getFullYear();
  const seasons = Array.from({ length: 5 }, (_, i) =>
    (currentYear - i).toString(),
  );

  return (
    <div className="bg-white border-b border-slate-200 z-10 pt-32">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Left side - Filters */}
          <div className="flex flex-wrap items-center gap-4">
            {/* Season Selector */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-black uppercase text-slate-400 tracking-wider">
                Season:
              </label>
              <select
                value={currentSeason}
                onChange={(e) => onSeasonChange(e.target.value)}
                className="px-4 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-sm hover:border-[#06054e] focus:border-[#06054e] outline-none transition-colors"
              >
                {seasons.map((season) => (
                  <option key={season} value={season}>
                    {season}
                  </option>
                ))}
              </select>
            </div>

            {/* Club Selector - Only show for super admins */}
            {userAccess?.isSuperAdmin && (
              <div className="flex items-center gap-2">
                <Building2 size={16} className="text-slate-400" />
                <select
                  value={selectedClub}
                  onChange={(e) => onClubChange(e.target.value)}
                  className="px-4 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-sm hover:border-[#06054e] focus:border-[#06054e] outline-none transition-colors min-w-[200px]"
                >
                  <option value="all">All Clubs</option>
                  {clubs
                    .filter((club) => club.clubId) // Filter out clubs without clubId
                    .map((club, index) => (
                      <option
                        key={`actionbar-club-${club.clubId}-${index}`}
                        value={club.clubId}
                      >
                        {club.name}
                      </option>
                    ))}
                </select>
              </div>
            )}

            {/* Count Badge */}
            <div className="px-4 py-2 bg-[#06054e]/5 rounded-xl">
              <span className="text-xs font-black uppercase text-[#06054e] tracking-wider">
                {rostersCount} {rostersCount === 1 ? "Roster" : "Rosters"}
              </span>
            </div>
          </div>

          {/* Right side - Actions */}
          <div className="flex items-center gap-3">
            {/* Refresh Button */}
            <button
              onClick={onRefresh}
              disabled={refreshing}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-sm text-slate-700 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw
                size={16}
                className={refreshing ? "animate-spin" : ""}
              />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            {/* Add Roster Button */}
            <button
              onClick={onAddRoster}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl font-black uppercase text-xs transition-all shadow-lg shadow-green-900/20 flex items-center gap-2"
            >
              <Plus size={16} />
              Add Roster
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
