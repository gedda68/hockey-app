// app/admin/components/modals/AddPlayerModal.tsx

import { useState } from "react";
import { Player } from "../../types";

interface AddPlayerModalProps {
  ageGroup: string;
  teamName: string;
  onClose: () => void;
  onSubmit: (ageGroup: string, teamName: string, player: Player) => void;
}

export default function AddPlayerModal({
  ageGroup,
  teamName,
  onClose,
  onSubmit,
}: AddPlayerModalProps) {
  const [player, setPlayer] = useState<Player>({
    name: "",
    club: "",
    icon: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (player.name.trim()) {
      onSubmit(ageGroup, teamName, player);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-md w-full p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-black uppercase text-[#06054e] mb-2">
          Add Player
        </h2>
        <p className="text-sm text-slate-500 mb-6">
          Adding to: <span className="font-bold">{teamName}</span> ({ageGroup})
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              Player Name *
            </label>
            <input
              type="text"
              value={player.name}
              onChange={(e) => setPlayer({ ...player, name: e.target.value })}
              placeholder="John Smith"
              className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:border-[#06054e] focus:outline-none"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              Club
            </label>
            <input
              type="text"
              value={player.club}
              onChange={(e) => setPlayer({ ...player, club: e.target.value })}
              placeholder="Brisbane Hockey Club"
              className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:border-[#06054e] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              Icon Path
            </label>
            <input
              type="text"
              value={player.icon}
              onChange={(e) => setPlayer({ ...player, icon: e.target.value })}
              placeholder="/icons/club.png"
              className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:border-[#06054e] focus:outline-none"
            />
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-slate-200 text-slate-900 rounded-full font-black uppercase hover:bg-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!player.name.trim()}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-full font-black uppercase hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add Player
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
