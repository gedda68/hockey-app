// sections/FeesSection.tsx
// Membership fees manager

import { DollarSign, Plus, Trash2 } from "lucide-react";
import { BaseSectionProps, Fee } from "../types/association.types";

export default function FeesSection({ formData, onChange }: BaseSectionProps) {
  const fees = formData.fees || [];

  const addFee = () => {
    const newFee: Fee = {
      feeId: `fee_${Date.now()}`,
      name: "",
      amount: 0,
      category: "",
      isActive: true,
    };
    onChange("fees", [...fees, newFee]);
  };

  const removeFee = (feeId: string) => {
    onChange(
      "fees",
      fees.filter((f) => f.feeId !== feeId),
    );
  };

  const updateFee = (feeId: string, field: keyof Fee, value: any) => {
    onChange(
      "fees",
      fees.map((f) => (f.feeId === feeId ? { ...f, [field]: value } : f)),
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-sm font-bold text-slate-500">
          Membership fees and charges (optional)
        </p>
        <button
          type="button"
          onClick={addFee}
          className="flex items-center gap-2 px-4 py-2 bg-[#06054e] text-white rounded-xl font-bold hover:bg-yellow-400 hover:text-[#06054e] transition-all"
        >
          <Plus size={18} />
          Add Fee
        </button>
      </div>

      {fees.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
          <DollarSign size={48} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-400 font-bold">No fees added yet</p>
          <p className="text-xs text-slate-400 mt-1">
            Click "Add Fee" to create membership fees
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {fees.map((fee) => (
            <div
              key={fee.feeId}
              className="p-6 bg-slate-50 rounded-2xl border-2 border-slate-100"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase text-slate-400 mb-2">
                    Fee Name *
                  </label>
                  <input
                    type="text"
                    value={fee.name}
                    onChange={(e) =>
                      updateFee(fee.feeId, "name", e.target.value)
                    }
                    className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl font-bold focus:border-yellow-400 outline-none"
                    placeholder="e.g. Registration Fee"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-slate-400 mb-2">
                    Amount ($) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={fee.amount}
                    onChange={(e) =>
                      updateFee(
                        fee.feeId,
                        "amount",
                        parseFloat(e.target.value) || 0,
                      )
                    }
                    className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl font-bold focus:border-yellow-400 outline-none"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-slate-400 mb-2">
                    Category
                  </label>
                  <input
                    type="text"
                    value={fee.category || ""}
                    onChange={(e) =>
                      updateFee(fee.feeId, "category", e.target.value)
                    }
                    className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl font-bold focus:border-yellow-400 outline-none"
                    placeholder="e.g. Player, Coach"
                  />
                </div>
              </div>

              <div className="flex justify-end mt-4">
                <button
                  type="button"
                  onClick={() => removeFee(fee.feeId)}
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
