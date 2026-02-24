// sections/HistorySection.tsx
// Player play history and past teams

import { BaseSectionProps, PlayerHistory } from "../types/player.types";
import { History, Calendar, Building2, Users, Trophy } from "lucide-react";

export default function HistorySection({
  formData,
  onChange,
  errors,
}: BaseSectionProps) {
  const playHistory = formData.playHistory || [];

  // Sort by season (most recent first)
  const sortedHistory = [...playHistory].sort((a, b) => {
    const yearA = parseInt(a.season);
    const yearB = parseInt(b.season);
    return yearB - yearA;
  });

  const currentYear = new Date().getFullYear();

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-xl flex items-start gap-3">
        <History size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="text-sm font-black text-blue-900">Play History</h4>
          <p className="text-xs text-blue-700 mt-1">
            This section shows the player's registration and play history across
            different seasons, clubs, and teams. History is automatically
            populated from registration data.
          </p>
        </div>
      </div>

      {/* Current Season Summary */}
      <div className="p-6 bg-gradient-to-r from-yellow-50 to-yellow-100 border-2 border-yellow-200 rounded-2xl">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-xl bg-yellow-400 flex items-center justify-center">
            <Trophy size={24} className="text-[#06054e]" />
          </div>
          <div>
            <h3 className="text-lg font-black text-[#06054e]">
              Current Season ({currentYear})
            </h3>
            <p className="text-sm text-yellow-800 font-bold">
              Active Registration
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div className="bg-white/50 rounded-xl p-3">
            <p className="text-xs text-slate-600 font-bold">Club</p>
            <p className="text-sm text-[#06054e] font-black mt-1">
              {formData.clubId || "Not assigned"}
            </p>
          </div>
          <div className="bg-white/50 rounded-xl p-3">
            <p className="text-xs text-slate-600 font-bold">Teams</p>
            <p className="text-sm text-[#06054e] font-black mt-1">
              {formData.teamIds.length > 0
                ? `${formData.teamIds.length} team(s)`
                : "None"}
            </p>
          </div>
          <div className="bg-white/50 rounded-xl p-3">
            <p className="text-xs text-slate-600 font-bold">Position</p>
            <p className="text-sm text-[#06054e] font-black mt-1">
              {formData.primaryPosition || "Not set"}
            </p>
          </div>
        </div>
      </div>

      {/* Historical Data */}
      <div>
        <h3 className="text-sm font-black text-slate-700 mb-4 flex items-center gap-2">
          <History size={18} />
          Previous Seasons
        </h3>

        {sortedHistory.length === 0 ? (
          <div className="p-8 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl text-center">
            <Calendar size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-600 font-bold">No historical data yet</p>
            <p className="text-xs text-slate-400 mt-1">
              Play history will be automatically populated as the player
              registers for new seasons
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedHistory.map((record, index) => (
              <div
                key={record.id}
                className="p-6 bg-white border-2 border-slate-100 rounded-2xl hover:border-yellow-400 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Season Header */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-lg bg-[#06054e] text-white flex items-center justify-center font-black">
                        {record.season}
                      </div>
                      <div>
                        <h4 className="text-lg font-black text-[#06054e]">
                          {record.season} Season
                        </h4>
                        {index === 0 && sortedHistory.length > 1 && (
                          <span className="text-xs text-slate-500 font-bold">
                            Most Recent
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                      {/* Club */}
                      <div className="flex items-start gap-3">
                        <Building2
                          size={16}
                          className="text-slate-400 flex-shrink-0 mt-0.5"
                        />
                        <div>
                          <p className="text-xs text-slate-500 font-bold">
                            Club
                          </p>
                          <p className="text-sm text-slate-900 font-black mt-0.5">
                            {record.clubName}
                          </p>
                        </div>
                      </div>

                      {/* Team */}
                      {record.teamName && (
                        <div className="flex items-start gap-3">
                          <Users
                            size={16}
                            className="text-slate-400 flex-shrink-0 mt-0.5"
                          />
                          <div>
                            <p className="text-xs text-slate-500 font-bold">
                              Team
                            </p>
                            <p className="text-sm text-slate-900 font-black mt-0.5">
                              {record.teamName}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Division */}
                      {record.division && (
                        <div className="flex items-start gap-3">
                          <Trophy
                            size={16}
                            className="text-slate-400 flex-shrink-0 mt-0.5"
                          />
                          <div>
                            <p className="text-xs text-slate-500 font-bold">
                              Division
                            </p>
                            <p className="text-sm text-slate-900 font-black mt-0.5">
                              {record.division}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Timeline Summary */}
      {sortedHistory.length > 0 && (
        <div className="pt-4 border-t-2 border-slate-100">
          <h4 className="text-xs font-black uppercase text-slate-400 mb-3">
            Career Summary
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-blue-50 rounded-xl text-center">
              <p className="text-2xl font-black text-blue-600">
                {sortedHistory.length + 1}
              </p>
              <p className="text-xs text-blue-800 font-bold mt-1">
                Total Seasons
              </p>
            </div>
            <div className="p-4 bg-green-50 rounded-xl text-center">
              <p className="text-2xl font-black text-green-600">
                {new Set(sortedHistory.map((h) => h.clubId)).size}
              </p>
              <p className="text-xs text-green-800 font-bold mt-1">
                Clubs Played For
              </p>
            </div>
            <div className="p-4 bg-purple-50 rounded-xl text-center">
              <p className="text-2xl font-black text-purple-600">
                {sortedHistory.filter((h) => h.teamName).length}
              </p>
              <p className="text-xs text-purple-800 font-bold mt-1">Teams</p>
            </div>
            <div className="p-4 bg-yellow-50 rounded-xl text-center">
              <p className="text-2xl font-black text-yellow-600">
                {sortedHistory[0]?.season || currentYear}
              </p>
              <p className="text-xs text-yellow-800 font-bold mt-1">
                First Season
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Read-Only Notice */}
      <div className="p-3 bg-slate-100 border border-slate-200 rounded-xl">
        <p className="text-xs text-slate-600 font-bold flex items-center gap-2">
          <History size={14} />
          <span>
            Play history is automatically generated from registration data and
            cannot be manually edited.
          </span>
        </p>
      </div>
    </div>
  );
}
