// sections/PositionsSection.tsx
// Committee positions with contact info and paid status

import { Users, Plus, Trash2 } from "lucide-react";
import { BaseSectionProps, Position } from "../types/association.types";

export default function PositionsSection({
  formData,
  onChange,
}: BaseSectionProps) {
  const positions = formData.positions || [];

  const addPosition = () => {
    const newPosition: Position = {
      positionId: `pos_${Date.now()}`,
      title: "",
      description: "",
      phone: "",
      email: "",
      isPaid: false,
      isActive: true,
    };
    onChange("positions", [...positions, newPosition]);
  };

  const removePosition = (positionId: string) => {
    onChange(
      "positions",
      positions.filter((p) => p.positionId !== positionId),
    );
  };

  const updatePosition = (
    positionId: string,
    field: keyof Position,
    value: any,
  ) => {
    onChange(
      "positions",
      positions.map((p) =>
        p.positionId === positionId ? { ...p, [field]: value } : p,
      ),
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-sm font-bold text-slate-500">
          Committee positions and roles (optional)
        </p>
        <button
          type="button"
          onClick={addPosition}
          className="flex items-center gap-2 px-4 py-2 bg-[#06054e] text-white rounded-xl font-bold hover:bg-yellow-400 hover:text-[#06054e] transition-all"
        >
          <Plus size={18} />
          Add Position
        </button>
      </div>

      {positions.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
          <Users size={48} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-400 font-bold">No positions added yet</p>
          <p className="text-xs text-slate-400 mt-1">
            Click "Add Position" to define committee roles
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {positions.map((position) => (
            <div
              key={position.positionId}
              className="p-6 bg-slate-50 rounded-2xl border-2 border-slate-100"
            >
              {/* Title and Description */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-black uppercase text-slate-400 mb-2">
                    Position Title *
                  </label>
                  <input
                    type="text"
                    value={position.title}
                    onChange={(e) =>
                      updatePosition(
                        position.positionId,
                        "title",
                        e.target.value,
                      )
                    }
                    className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl font-bold focus:border-yellow-400 outline-none"
                    placeholder="e.g. President, Secretary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-slate-400 mb-2">
                    Description
                  </label>
                  <input
                    type="text"
                    value={position.description || ""}
                    onChange={(e) =>
                      updatePosition(
                        position.positionId,
                        "description",
                        e.target.value,
                      )
                    }
                    className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl font-bold focus:border-yellow-400 outline-none"
                    placeholder="Brief description of role (optional)"
                  />
                </div>
              </div>

              {/* Phone and Email */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-black uppercase text-slate-400 mb-2">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={position.phone || ""}
                    onChange={(e) =>
                      updatePosition(
                        position.positionId,
                        "phone",
                        e.target.value,
                      )
                    }
                    className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl font-bold focus:border-yellow-400 outline-none"
                    placeholder="+61 400 000 000 (optional)"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-slate-400 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={position.email || ""}
                    onChange={(e) =>
                      updatePosition(
                        position.positionId,
                        "email",
                        e.target.value,
                      )
                    }
                    className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl font-bold focus:border-yellow-400 outline-none"
                    placeholder="contact@example.com (optional)"
                  />
                </div>
              </div>

              {/* Paid Position Checkbox */}
              <div className="mb-4">
                <label className="flex items-center gap-3 p-4 bg-white border-2 border-slate-200 rounded-xl cursor-pointer hover:border-yellow-400 transition-all">
                  <input
                    type="checkbox"
                    checked={position.isPaid}
                    onChange={(e) =>
                      updatePosition(
                        position.positionId,
                        "isPaid",
                        e.target.checked,
                      )
                    }
                    className="w-5 h-5 accent-[#06054e]"
                  />
                  <div>
                    <span className="block font-bold text-slate-700">
                      Paid Position
                    </span>
                    <span className="text-xs text-slate-400">
                      Check if this is a remunerated role
                    </span>
                  </div>
                </label>
              </div>

              {/* Remove Button */}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => removePosition(position.positionId)}
                  className="flex items-center gap-2 px-4 py-2 text-red-600 font-bold hover:bg-red-50 rounded-xl transition-all"
                >
                  <Trash2 size={16} />
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
