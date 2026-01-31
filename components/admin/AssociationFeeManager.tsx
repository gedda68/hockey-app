"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, Save } from "lucide-react";

export type Fee = {
  id: string;
  name: string;
  amount: number;
  appliesTo: string;
};

export default function AssociationFeeManager({
  ownerType,
  ownerId,
  initialFees,
}: {
  ownerType: "association" | "club";
  ownerId: string;
  initialFees: Fee[];
}) {
  const [fees, setFees] = useState<Fee[]>(initialFees);
  const [isPending, startTransition] = useTransition();

  function addFee() {
    setFees([
      ...fees,
      {
        id: crypto.randomUUID(),
        name: "",
        amount: 0,
        appliesTo: "player",
      },
    ]);
  }

  function updateFee(id: string, field: keyof Fee, value: any) {
    setFees(fees.map((f) => (f.id === id ? { ...f, [field]: value } : f)));
  }

  function removeFee(id: string) {
    setFees(fees.filter((f) => f.id !== id));
  }

  function saveFees() {
    startTransition(async () => {
      await fetch(`/api/admin/fees`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ownerType, ownerId, fees }),
      });
    });
  }

  return (
    <div className="bg-white rounded-2xl shadow p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-black text-[#06054e]">Fees</h2>
        <button
          onClick={addFee}
          className="flex items-center gap-2 px-4 py-2 bg-[#06054e] text-white rounded-xl font-bold"
        >
          <Plus size={18} />
          Add Fee
        </button>
      </div>

      {fees.length === 0 && (
        <p className="text-slate-500 font-bold">
          No fees configured for this association.
        </p>
      )}

      <div className="space-y-4">
        {fees.map((fee) => (
          <div key={fee.id} className="grid grid-cols-12 gap-3 items-center">
            <input
              className="col-span-5 input"
              placeholder="Fee name"
              value={fee.name}
              onChange={(e) => updateFee(fee.id, "name", e.target.value)}
            />

            <input
              type="number"
              className="col-span-3 input"
              value={fee.amount}
              onChange={(e) =>
                updateFee(fee.id, "amount", Number(e.target.value))
              }
            />

            <select
              className="col-span-3 input"
              value={fee.appliesTo}
              onChange={(e) => updateFee(fee.id, "appliesTo", e.target.value)}
            >
              <option value="player">Player</option>
              <option value="team">Team</option>
              <option value="club">Club</option>
            </select>

            <button
              onClick={() => removeFee(fee.id)}
              className="col-span-1 text-red-600 hover:text-red-800"
            >
              <Trash2 />
            </button>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <button
          onClick={saveFees}
          disabled={isPending}
          className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl font-black"
        >
          <Save size={18} />
          {isPending ? "Saving..." : "Save Fees"}
        </button>
      </div>
    </div>
  );
}
