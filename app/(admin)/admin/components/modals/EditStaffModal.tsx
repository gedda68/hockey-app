// app/admin/components/modals/EditStaffModal.tsx

import { Staff } from "../../types";

interface EditStaffModalProps {
  staff: Staff;
  role: string;
  onChange: (staff: Staff) => void;
  onClose: () => void;
  onSubmit: () => void;
}

export default function EditStaffModal({
  staff,
  role,
  onChange,
  onClose,
  onSubmit,
}: EditStaffModalProps) {
  const roleLabels: { [key: string]: string } = {
    coach: "Coach",
    asstCoach: "Assistant Coach",
    manager: "Manager",
    umpire: "Umpire",
  };

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
        <h2 className="text-2xl font-black uppercase text-[#06054e] mb-2">
          {staff.name ? "Edit" : "Add"} Staff
        </h2>
        <p className="text-sm text-slate-500 mb-6">
          Role: <span className="font-bold">{roleLabels[role] || role}</span>
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              Staff Name *
            </label>
            <input
              type="text"
              value={staff.name}
              onChange={(e) => onChange({ ...staff, name: e.target.value })}
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
              value={staff.club}
              onChange={(e) => onChange({ ...staff, club: e.target.value })}
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
              value={staff.icon}
              onChange={(e) => onChange({ ...staff, icon: e.target.value })}
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
              disabled={!staff.name.trim()}
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
