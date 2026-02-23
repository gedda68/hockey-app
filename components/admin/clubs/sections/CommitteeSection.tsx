// sections/CommitteeSection.tsx
// Club committee: CRUD manager for committee members

import { Users, Plus, Trash2 } from "lucide-react";
import { BaseSectionProps, CommitteeMember } from "../types/club.types";

export default function CommitteeSection({
  formData,
  onChange,
}: BaseSectionProps) {
  const committee = formData.committee || [];

  const addMember = () => {
    const newMember: CommitteeMember = {
      id: `member-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: "",
      position: "",
      email: "",
      phone: "",
    };
    onChange("committee", [...committee, newMember]);
  };

  const removeMember = (id: string) => {
    onChange(
      "committee",
      committee.filter((m) => m.id !== id),
    );
  };

  const updateMember = (
    id: string,
    field: keyof CommitteeMember,
    value: string,
  ) => {
    onChange(
      "committee",
      committee.map((m) => (m.id === id ? { ...m, [field]: value } : m)),
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm font-bold text-slate-500">
            Committee members (optional)
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Add key people in your club's committee
          </p>
        </div>
        <button
          type="button"
          onClick={addMember}
          className="flex items-center gap-2 px-4 py-2 bg-[#06054e] text-white rounded-xl font-bold hover:bg-yellow-400 hover:text-[#06054e] transition-all"
        >
          <Plus size={18} />
          Add Member
        </button>
      </div>

      {committee.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
          <Users size={48} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-400 font-bold">
            No committee members added yet
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Click "Add Member" to add committee members
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {committee.map((member, index) => (
            <div
              key={member.id}
              className="p-6 bg-slate-50 rounded-2xl border-2 border-slate-100"
            >
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-black text-slate-600 uppercase">
                  Member #{index + 1}
                </h4>
                <button
                  type="button"
                  onClick={() => removeMember(member.id)}
                  className="flex items-center gap-2 px-3 py-1.5 text-red-600 font-bold hover:bg-red-50 rounded-lg transition-all text-sm"
                >
                  <Trash2 size={14} />
                  Remove
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase text-slate-400 mb-2">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={member.name}
                    onChange={(e) =>
                      updateMember(member.id, "name", e.target.value)
                    }
                    placeholder="Full Name"
                    className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl font-bold focus:border-yellow-400 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-slate-400 mb-2">
                    Position *
                  </label>
                  <select
                    value={member.position}
                    onChange={(e) =>
                      updateMember(member.id, "position", e.target.value)
                    }
                    className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl font-bold focus:border-yellow-400 outline-none"
                  >
                    <option value="">Select position...</option>
                    {formData.committeePositions.map((pos) => (
                      <option key={pos} value={pos}>
                        {pos}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-slate-400 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={member.email}
                    onChange={(e) =>
                      updateMember(member.id, "email", e.target.value)
                    }
                    placeholder="email@example.com"
                    className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl font-bold focus:border-yellow-400 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-slate-400 mb-2">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={member.phone}
                    onChange={(e) =>
                      updateMember(member.id, "phone", e.target.value)
                    }
                    placeholder="+61 400 000 000"
                    className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl font-bold focus:border-yellow-400 outline-none"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Manage Positions */}
      <div className="pt-4 border-t-2 border-slate-100">
        <p className="text-xs font-black uppercase text-slate-400 mb-3">
          Available Positions
        </p>
        <div className="flex flex-wrap gap-2">
          {formData.committeePositions.map((pos) => (
            <span
              key={pos}
              className="px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg"
            >
              {pos}
            </span>
          ))}
        </div>
        <p className="text-xs text-slate-400 mt-2">
          Custom positions can be managed in club settings
        </p>
      </div>
    </div>
  );
}
