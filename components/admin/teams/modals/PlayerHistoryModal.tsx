// app/admin/teams/components/modals/PlayerHistoryModal.tsx
// View player selection history

"use client";

import type { Player } from "@/types/admin/teams.types";

interface PlayerHistoryModalProps {
  player: Player;
  onClose: () => void;
}

export default function PlayerHistoryModal({
  player,
  onClose,
}: PlayerHistoryModalProps) {
  const history = player.teamSelectionHistory || [];
  const displayName =
    [player.firstName, player.lastName].filter(Boolean).join(" ").trim() ||
    player.name ||
    "Player";

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998]"
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center p-4 z-[9999]">
        <div
          className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-800 to-purple-700 px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black uppercase text-white">
                  Selection History
                </h2>
                <p className="text-sm text-purple-200 mt-1">
                  {displayName}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
              >
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-8 max-h-[60vh] overflow-y-auto">
            {history.length === 0 ? (
              <div className="text-center py-12">
                <svg
                  className="w-16 h-16 mx-auto text-slate-300 mb-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-slate-500 font-bold">
                  No selection history yet
                </p>
                <p className="text-sm text-slate-400 mt-1">
                  This player hasn't been selected for any teams
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {history.map((record) => (
                  <div
                    key={record.id}
                    className="p-4 bg-slate-50 border-2 border-slate-200 rounded-xl"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-black text-lg text-slate-800">
                          {record.division} · {record.teamName}
                        </div>
                        <div className="text-sm text-slate-600 mt-1">
                          <span className="font-bold">#{record.number}</span>
                          {" · "}
                          <span>{record.position}</span>
                        </div>
                        <div className="text-xs text-slate-500 mt-2">
                          Season: {record.season}
                        </div>
                      </div>

                      <div className="text-right">
                        <div
                          className={`inline-block px-3 py-1 rounded-lg text-xs font-bold ${
                            record.deselectedDate
                              ? "bg-slate-200 text-slate-600"
                              : "bg-green-100 text-green-700"
                          }`}
                        >
                          {record.deselectedDate ? "Past" : "Current"}
                        </div>

                        <div className="text-xs text-slate-500 mt-2">
                          <div>
                            Selected:{" "}
                            {new Date(record.selectedDate).toLocaleDateString()}
                          </div>
                          {record.deselectedDate && (
                            <div>
                              Ended:{" "}
                              {new Date(
                                record.deselectedDate,
                              ).toLocaleDateString()}
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

          {/* Footer */}
          <div className="bg-slate-50 border-t border-slate-200 px-8 py-6">
            <button
              onClick={onClose}
              className="w-full px-6 py-3 bg-slate-700 text-white rounded-xl font-black uppercase text-sm hover:bg-slate-800 transition-all"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
