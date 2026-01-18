// app/admin/components/modals/EditSelectorModal.tsx
// FIXED: Proper "Add Selector" vs "Edit Selector" title, removed email/phone

import { Selector } from "../../types";

interface EditSelectorModalProps {
  selector: Selector | null;
  isNew?: boolean; // NEW: Flag to indicate if adding new selector
  onChange: (selector: Selector) => void;
  onClose: () => void;
  onSubmit: () => void;
}

export default function EditSelectorModal({
  selector,
  isNew = false,
  onChange,
  onClose,
  onSubmit,
}: EditSelectorModalProps) {
  if (!selector) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  // Determine if this is add mode (empty name) or edit mode
  const isAddMode = isNew || !selector.name || selector.name.trim() === "";

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-md w-full p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-6">
          {selector.isChair && (
            <div className="w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center text-2xl">
              👑
            </div>
          )}
          <div>
            <h2 className="text-2xl font-black uppercase text-[#06054e]">
              {isAddMode ? "Add Selector" : "Edit Selector"}
            </h2>
            {selector.isChair && (
              <p className="text-sm text-yellow-600 font-bold">
                Chair of Selectors
              </p>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              Name *
            </label>
            <input
              type="text"
              value={selector.name}
              onChange={(e) => onChange({ ...selector, name: e.target.value })}
              placeholder="John Smith"
              className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:border-purple-600 focus:outline-none"
              autoFocus
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              Club *
            </label>
            <input
              type="text"
              value={selector.club}
              onChange={(e) => onChange({ ...selector, club: e.target.value })}
              placeholder="Brisbane Hockey Club"
              className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:border-purple-600 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              Club Icon Path
            </label>
            <input
              type="text"
              value={selector.icon || ""}
              onChange={(e) => onChange({ ...selector, icon: e.target.value })}
              placeholder="/icons/club.png"
              className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:border-purple-600 focus:outline-none"
            />
          </div>

          {/* Chair Checkbox */}
          <div className="p-4 bg-yellow-50 rounded-xl border-2 border-yellow-200">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={selector.isChair}
                onChange={(e) =>
                  onChange({ ...selector, isChair: e.target.checked })
                }
                className="w-5 h-5 text-yellow-600 border-2 border-yellow-400 rounded focus:ring-2 focus:ring-yellow-500"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">👑</span>
                  <span className="font-black text-slate-900">
                    Chair of Selectors
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  This person will lead the selection panel
                </p>
              </div>
            </label>
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
              disabled={!selector.name.trim() || !selector.club.trim()}
              className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-full font-black uppercase hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAddMode ? "Add" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
