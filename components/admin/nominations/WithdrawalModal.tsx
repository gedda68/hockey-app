"use client";

/**
 * WithdrawalModal
 * Shown when a selected rep team player is withdrawn from the squad.
 * Captures a structured reason and optional note.
 */

import { useState } from "react";

type WithdrawalReason = "injury" | "personal" | "holiday" | "work" | "other";

interface WithdrawalData {
  reason: WithdrawalReason;
  note: string;
}

interface WithdrawalModalProps {
  playerName: string;
  onConfirm: (data: WithdrawalData) => void;
  onCancel: () => void;
}

const REASON_OPTIONS: { value: WithdrawalReason; label: string; icon: string }[] = [
  { value: "injury",   label: "Injury",              icon: "🤕" },
  { value: "personal", label: "Personal commitment", icon: "🏠" },
  { value: "holiday",  label: "Holiday / Travel",    icon: "✈️" },
  { value: "work",     label: "Work commitment",     icon: "💼" },
  { value: "other",    label: "Other",               icon: "📋" },
];

export default function WithdrawalModal({ playerName, onConfirm, onCancel }: WithdrawalModalProps) {
  const [reason, setReason] = useState<WithdrawalReason>("personal");
  const [note, setNote]     = useState("");

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="font-black text-[#06054e] text-lg uppercase">Withdraw from Squad</h3>
          <p className="text-sm text-slate-500 mt-0.5">{playerName}</p>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-black uppercase text-slate-500 mb-2">Reason</label>
            <div className="grid grid-cols-2 gap-2">
              {REASON_OPTIONS.map(({ value, label, icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setReason(value)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-sm font-bold transition-all text-left ${
                    reason === value
                      ? "border-[#06054e] bg-[#06054e]/5 text-[#06054e]"
                      : "border-slate-200 text-slate-600 hover:border-slate-300"
                  }`}
                >
                  <span>{icon}</span>
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-black uppercase text-slate-500 mb-1.5">
              Note <span className="normal-case font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={reason === "injury" ? "e.g. knee injury" : "Additional details"}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-[#06054e] focus:border-transparent"
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-200 flex gap-3">
          <button
            onClick={() => onConfirm({ reason, note: note.trim() })}
            className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-black uppercase hover:bg-red-700 transition-colors"
          >
            Confirm Withdrawal
          </button>
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-black uppercase hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
