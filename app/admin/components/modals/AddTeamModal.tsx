// app/admin/components/modals/AddTeamModal.tsx

import { useState } from "react";

interface AddTeamModalProps {
  ageGroup: string;
  onClose: () => void;
  onSubmit: (ageGroup: string, teamName: string) => void;
}

export default function AddTeamModal({
  ageGroup,
  onClose,
  onSubmit,
}: AddTeamModalProps) {
  const [teamName, setTeamName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (teamName.trim()) {
      onSubmit(ageGroup, teamName.trim());
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
          Add Team
        </h2>
        <p className="text-sm text-slate-500 mb-6">
          Adding to: <span className="font-bold">{ageGroup}</span>
        </p>

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="block text-sm font-bold text-slate-700 mb-2">
              Team Name
            </label>
            <input
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="e.g. Green Team, Gold Team"
              className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:border-[#06054e] focus:outline-none"
              autoFocus
            />
          </div>

          <div className="flex gap-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-slate-200 text-slate-900 rounded-full font-black uppercase hover:bg-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!teamName.trim()}
              className="flex-1 px-6 py-3 bg-green-600 text-white rounded-full font-black uppercase hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add Team
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
