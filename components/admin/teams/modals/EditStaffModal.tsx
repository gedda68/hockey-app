// components/admin/teams/components/modals/EditStaffModal.tsx
// Modal to edit coaching staff (coach, assistant coach, manager)

import { User, Mail, Phone, Award } from "lucide-react";
import type { Staff, StaffRole } from "../../types/team.types";
import { STAFF_ROLE_LABELS } from "../../types/team.types";

interface EditStaffModalProps {
  staff: Staff;
  role: StaffRole;
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
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  const isNewStaff = !staff.name && !staff.email && !staff.phone;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-8 py-6 rounded-t-3xl flex items-center justify-between z-10">
          <div>
            <h2 className="text-2xl font-black uppercase text-[#06054e] tracking-tight">
              {isNewStaff ? "Assign" : "Edit"} {STAFF_ROLE_LABELS[role]}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {isNewStaff
                ? "Add coaching staff member"
                : "Update staff details"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <svg
              className="w-6 h-6 text-slate-400"
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {/* Role Badge */}
          <div className="p-4 bg-gradient-to-r from-[#06054e] to-blue-700 rounded-xl">
            <div className="flex items-center gap-3 text-white">
              <Award size={24} />
              <div>
                <p className="text-xs font-bold uppercase tracking-wider opacity-80">
                  Role
                </p>
                <p className="text-xl font-black">{STAFF_ROLE_LABELS[role]}</p>
              </div>
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-xs font-black uppercase text-slate-400 tracking-wider mb-2">
              Full Name *
            </label>
            <div className="relative">
              <User
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                size={20}
              />
              <input
                type="text"
                value={staff.name}
                onChange={(e) => onChange({ ...staff, name: e.target.value })}
                required
                autoFocus
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold focus:border-[#06054e] outline-none transition-colors"
                placeholder="e.g. John Smith"
              />
            </div>
          </div>

          {/* Email and Phone */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-black uppercase text-slate-400 tracking-wider mb-2">
                Email
              </label>
              <div className="relative">
                <Mail
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  size={20}
                />
                <input
                  type="email"
                  value={staff.email || ""}
                  onChange={(e) =>
                    onChange({ ...staff, email: e.target.value })
                  }
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold focus:border-[#06054e] outline-none transition-colors"
                  placeholder="email@example.com"
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs font-black uppercase text-slate-400 tracking-wider mb-2">
                Phone
              </label>
              <div className="relative">
                <Phone
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  size={20}
                />
                <input
                  type="tel"
                  value={staff.phone || ""}
                  onChange={(e) =>
                    onChange({ ...staff, phone: e.target.value })
                  }
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold focus:border-[#06054e] outline-none transition-colors"
                  placeholder="0400 000 000"
                />
              </div>
            </div>
          </div>

          {/* Member ID (if linked to member database) */}
          <div>
            <label className="block text-xs font-black uppercase text-slate-400 tracking-wider mb-2">
              Member ID (Optional)
            </label>
            <div className="relative">
              <Award
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                size={20}
              />
              <input
                type="text"
                value={staff.memberId || ""}
                onChange={(e) =>
                  onChange({ ...staff, memberId: e.target.value })
                }
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold focus:border-[#06054e] outline-none transition-colors"
                placeholder="e.g. CHC-0001234"
              />
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Link to member database if this person is also a club member
            </p>
          </div>

          {/* Member ID Status */}
          {staff.memberId && (
            <div className="p-4 bg-green-50 border-2 border-green-200 rounded-xl">
              <p className="font-bold text-green-700 flex items-center gap-2">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Linked to Member: {staff.memberId}
              </p>
              <p className="text-xs text-green-600 mt-1">
                This staff member is linked to the member database
              </p>
            </div>
          )}

          {/* Summary Box */}
          {staff.name && (
            <div className="p-6 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-xs font-black uppercase text-slate-400 tracking-wider mb-3">
                Staff Summary
              </p>
              <div className="space-y-2">
                <div className="flex items-start gap-3">
                  <User size={20} className="text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">
                      Name
                    </p>
                    <p className="text-lg font-black text-slate-900">
                      {staff.name}
                    </p>
                  </div>
                </div>

                {staff.email && (
                  <div className="flex items-start gap-3">
                    <Mail size={20} className="text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">
                        Email
                      </p>
                      <p className="text-sm font-bold text-slate-700">
                        {staff.email}
                      </p>
                    </div>
                  </div>
                )}

                {staff.phone && (
                  <div className="flex items-start gap-3">
                    <Phone size={20} className="text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">
                        Phone
                      </p>
                      <p className="text-sm font-bold text-slate-700">
                        {staff.phone}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <Award size={20} className="text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">
                      Role
                    </p>
                    <p className="text-sm font-bold text-slate-700">
                      {STAFF_ROLE_LABELS[role]}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Info Box */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <div className="flex gap-3">
              <svg
                className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5"
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
              <div className="text-xs text-blue-700">
                <p className="font-bold mb-1">Contact Information</p>
                <p>
                  Email and phone are optional but recommended for team
                  communication.
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-sm text-slate-700 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!staff.name.trim()}
              className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-xl font-black uppercase text-xs transition-all shadow-lg shadow-blue-900/20 disabled:shadow-none"
            >
              {isNewStaff ? "Assign Staff" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
