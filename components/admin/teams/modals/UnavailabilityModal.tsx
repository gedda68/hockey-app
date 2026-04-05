"use client";

/**
 * UnavailabilityModal
 * Shown when a player is dragged to the Unavailable zone.
 * Captures structured reason, start date, and weeks out.
 * Returns the filled-out unavailability data on confirm.
 */

import { useState } from "react";
import type { UnavailableType, Player } from "@/types/admin/teams.types";

interface UnavailabilityData {
  unavailableType: UnavailableType;
  unavailableFrom: string;
  unavailableWeeks: number;
  unavailableUntil: string;
  unavailableNote: string;
}

interface UnavailabilityModalProps {
  player: Player;
  onConfirm: (data: UnavailabilityData) => void;
  onCancel: () => void;
}

const TYPE_OPTIONS: { value: UnavailableType; label: string; icon: string }[] = [
  { value: "injury",   label: "Injury",              icon: "🤕" },
  { value: "personal", label: "Personal commitment", icon: "🏠" },
  { value: "holiday",  label: "Holiday / Travel",    icon: "✈️" },
  { value: "work",     label: "Work commitment",     icon: "💼" },
  { value: "other",    label: "Other",               icon: "📋" },
];

function addWeeks(isoDate: string, weeks: number): string {
  const d = new Date(isoDate);
  d.setDate(d.getDate() + weeks * 7);
  return d.toISOString().split("T")[0];
}

function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

export default function UnavailabilityModal({ player, onConfirm, onCancel }: UnavailabilityModalProps) {
  const name = player.firstName && player.lastName
    ? `${player.firstName} ${player.lastName}`
    : player.name || "Player";

  const [type, setType]     = useState<UnavailableType>("injury");
  const [from, setFrom]     = useState(todayISO());
  const [weeks, setWeeks]   = useState(1);
  const [note, setNote]     = useState("");

  const returnDate = addWeeks(from, weeks);
  const returnDisplay = new Date(returnDate).toLocaleDateString("en-AU", {
    weekday: "short", day: "numeric", month: "short",
  });

  function handleConfirm() {
    onConfirm({
      unavailableType:  type,
      unavailableFrom:  from,
      unavailableWeeks: weeks,
      unavailableUntil: returnDate,
      unavailableNote:  note.trim(),
    });
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="font-black text-[#06054e] text-lg uppercase">Mark Unavailable</h3>
          <p className="text-sm text-slate-500 mt-0.5">{name}</p>
        </div>

        <div className="p-6 space-y-4">
          {/* Reason type */}
          <div>
            <label className="block text-xs font-black uppercase text-slate-500 mb-2">Reason</label>
            <div className="grid grid-cols-2 gap-2">
              {TYPE_OPTIONS.map(({ value, label, icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setType(value)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-sm font-bold transition-all text-left ${
                    type === value
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

          {/* From date */}
          <div>
            <label className="block text-xs font-black uppercase text-slate-500 mb-1.5">From Date</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-[#06054e] focus:border-transparent"
            />
          </div>

          {/* Weeks out */}
          <div>
            <label className="block text-xs font-black uppercase text-slate-500 mb-1.5">
              Weeks Out
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={1}
                max={26}
                value={weeks}
                onChange={(e) => setWeeks(Number(e.target.value))}
                className="flex-1 accent-[#06054e]"
              />
              <span className="w-20 text-center px-3 py-1.5 bg-[#06054e] text-white rounded-xl text-sm font-black">
                {weeks} wk{weeks !== 1 ? "s" : ""}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1.5">
              Expected return: <span className="font-bold text-[#06054e]">{returnDisplay}</span>
            </p>
          </div>

          {/* Optional note */}
          <div>
            <label className="block text-xs font-black uppercase text-slate-500 mb-1.5">
              Note <span className="normal-case font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={type === "injury" ? "e.g. hamstring strain" : "Additional details"}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-[#06054e] focus:border-transparent"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-slate-200 flex gap-3">
          <button
            onClick={handleConfirm}
            className="flex-1 py-2.5 bg-[#06054e] text-white rounded-xl text-sm font-black uppercase hover:bg-[#0a0870] transition-colors"
          >
            Confirm
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
