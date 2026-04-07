// app/admin/teams/components/modals/EditPlayerModal.tsx
// Edit player number and position

"use client";

import { useState } from "react";
import type { Player } from "@/types/admin/teams.types";

interface EditPlayerModalProps {
  player: Player;
  teamName: string;
  onClose: () => void;
  onSave: (number: string, position: string) => void;
}

const POSITIONS = [
  "Forward",
  "Midfielder",
  "Defender",
  "Goalkeeper",
  "Striker",
  "Winger",
  "Centre Back",
  "Full Back",
  "Attacking Midfielder",
  "Defensive Midfielder",
];

export default function EditPlayerModal({
  player,
  teamName,
  onClose,
  onSave,
}: EditPlayerModalProps) {
  const [number, setNumber] = useState(player.number ?? "");
  const [position, setPosition] = useState(player.position ?? "");
  const displayName =
    [player.firstName, player.lastName].filter(Boolean).join(" ").trim() ||
    player.name ||
    "Player";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!number || !position) {
      alert("Number and position are required");
      return;
    }
    onSave(number, position);
  };

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
          className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <form onSubmit={handleSubmit}>
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-800 to-blue-700 px-8 py-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black uppercase text-white">
                    Edit Player
                  </h2>
                  <p className="text-sm text-blue-200 mt-1">
                    {displayName} · {teamName}
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
            <div className="p-8 space-y-6">
              {/* Number */}
              <div>
                <label className="block text-xs font-black uppercase text-slate-400 tracking-wider mb-2">
                  Jersey Number *
                </label>
                <input
                  type="text"
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  placeholder="e.g., 7"
                  className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-lg focus:border-blue-500 outline-none"
                  autoFocus
                />
              </div>

              {/* Position */}
              <div>
                <label className="block text-xs font-black uppercase text-slate-400 tracking-wider mb-2">
                  Position *
                </label>
                <select
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold focus:border-blue-500 outline-none"
                >
                  <option value="">Select position...</option>
                  {POSITIONS.map((pos) => (
                    <option key={pos} value={pos}>
                      {pos}
                    </option>
                  ))}
                </select>
              </div>

              {/* Current Values Info */}
              <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
                <div className="text-xs font-black uppercase text-blue-600 mb-1">
                  Current
                </div>
                <div className="text-sm text-blue-900">
                  <span className="font-bold">#{player.number ?? "—"}</span>
                  {" · "}
                  <span>{player.position ?? "—"}</span>
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
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl font-black uppercase text-sm hover:bg-blue-700 transition-all shadow-lg"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
