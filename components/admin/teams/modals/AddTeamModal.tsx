// app/admin/teams/components/modals/AddTeamModal.tsx
// Add Team Modal - Club pre-filled, name optional

"use client";

import { useState } from "react";

interface AddTeamModalProps {
  roster: {
    id: string;
    clubId: string;
    clubName: string;
    division: string;
    category: string;
    gender: string;
    teams: any[];
  };
  onClose: () => void;
  onSubmit: (data: { name: string }) => void;
}

export default function AddTeamModal({
  roster,
  onClose,
  onSubmit,
}: AddTeamModalProps) {
  // Default name: use division if first team, otherwise empty
  const defaultName = roster.teams.length === 0 ? roster.division : "";
  const [teamName, setTeamName] = useState(defaultName);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // If no name provided, use division name
    const finalName = teamName.trim() || roster.division;

    onSubmit({ name: finalName });
  };

  const isFirstTeam = roster.teams.length === 0;
  const hasMultipleTeams = roster.teams.length > 0;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998]"
        onClick={onClose}
      ></div>

      <div className="fixed inset-0 flex items-center justify-center p-4 z-[9999]">
        <div
          className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <form onSubmit={handleSubmit}>
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-8 py-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black uppercase text-[#06054e]">
                    Add Team
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    {roster.clubName} · {roster.division} {roster.category}{" "}
                    {roster.gender}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
                >
                  <svg
                    className="w-6 h-6"
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
            <div className="px-8 py-6 space-y-6">
              {/* Club Info (Read-only) */}
              <div>
                <label className="block text-xs font-black uppercase text-slate-400 tracking-wider mb-2">
                  Club
                </label>
                <div className="px-4 py-3 bg-slate-100 border-2 border-slate-200 rounded-xl">
                  <div className="flex items-center gap-3">
                    <svg
                      className="w-5 h-5 text-slate-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span className="font-bold text-slate-700">
                      {roster.clubName}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Team will be created for this club's {roster.division} roster
                </p>
              </div>

              {/* Team Name */}
              <div>
                <label className="block text-xs font-black uppercase text-slate-400 tracking-wider mb-2">
                  Team Name{" "}
                  {hasMultipleTeams && <span className="text-red-500">*</span>}
                  {isFirstTeam && (
                    <span className="text-slate-400 normal-case ml-2">
                      (Optional - defaults to {roster.division})
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder={
                    isFirstTeam
                      ? `${roster.division} (default)`
                      : "e.g., Gold, Silver, Division 1"
                  }
                  className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold focus:border-[#06054e] outline-none"
                />

                {isFirstTeam ? (
                  <p className="text-xs text-slate-500 mt-2 flex items-start gap-2">
                    <svg
                      className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    Leave blank to use "{roster.division}" as the team name
                  </p>
                ) : (
                  <p className="text-xs text-slate-500 mt-2 flex items-start gap-2">
                    <svg
                      className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                    Give this team a unique name (you already have:{" "}
                    {roster.teams.map((t) => t.name).join(", ")})
                  </p>
                )}
              </div>

              {/* Preview */}
              <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
                <div className="text-xs font-black uppercase text-blue-600 mb-2">
                  Team Preview
                </div>
                <div className="text-lg font-black text-blue-900">
                  {roster.clubName} - {teamName.trim() || roster.division}
                </div>
                <div className="text-sm text-blue-700 mt-1">
                  {roster.division} {roster.category} {roster.gender}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-50 border-t border-slate-200 px-8 py-6 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-3 bg-white border-2 border-slate-200 rounded-xl font-black uppercase text-sm text-slate-600 hover:bg-slate-100 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-6 py-3 bg-[#06054e] text-white rounded-xl font-black uppercase text-sm hover:bg-blue-900 transition-all shadow-lg"
              >
                {isFirstTeam
                  ? `Create ${teamName.trim() || roster.division} Team`
                  : `Add ${teamName.trim() || "Team"}`}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
