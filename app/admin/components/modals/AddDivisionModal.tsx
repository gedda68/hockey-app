// app/admin/components/modals/AddDivisionModal.tsx

import { useState } from "react";

interface AddDivisionModalProps {
  onClose: () => void;
  onSubmit: (ageGroup: string) => void;
}

export default function AddDivisionModal({
  onClose,
  onSubmit,
}: AddDivisionModalProps) {
  const [ageGroup, setAgeGroup] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (ageGroup.trim()) {
      onSubmit(ageGroup.trim());
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
        <h2 className="text-2xl font-black uppercase text-[#06054e] mb-6">
          Add Division
        </h2>

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="block text-sm font-bold text-slate-700 mb-2">
              Age Group / Division Name
            </label>
            <input
              type="text"
              value={ageGroup}
              onChange={(e) => setAgeGroup(e.target.value)}
              placeholder="e.g. Under 18, Under 21"
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
              disabled={!ageGroup.trim()}
              className="flex-1 px-6 py-3 bg-green-600 text-white rounded-full font-black uppercase hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
