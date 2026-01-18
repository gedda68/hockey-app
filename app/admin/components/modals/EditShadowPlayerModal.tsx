// app/admin/components/modals/EditShadowPlayerModal.tsx

import { Player } from "../../types";

interface EditShadowPlayerModalProps {
  player: Player;
  onChange: (player: Player) => void;
  onClose: () => void;
  onSubmit: () => void;
}

export default function EditShadowPlayerModal({
  player,
  onChange,
  onClose,
  onSubmit,
}: EditShadowPlayerModalProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
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
        <h2 className="text-2xl font-black uppercase text-[#06054e] mb-6">
          Edit Shadow Player
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              Player Name *
            </label>
            <input
              type="text"
              value={player.name}
              onChange={(e) => onChange({ ...player, name: e.target.value })}
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
              onChange={(e) => onChange({ ...player, club: e.target.value })}
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
              onChange={(e) => onChange({ ...player, icon: e.target.value })}
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
              className="flex-1 px-6 py-3 bg-[#06054e] text-white rounded-full font-black uppercase hover:bg-[#0a0870] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
