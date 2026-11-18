"use client";

// Three big buttons: I'm in / Maybe / Can't make it. One tap answers; "Can't make it" can take an optional reason.

import { useState } from "react";
import { Check, HelpCircle, X } from "lucide-react";
import type { RsvpAnswer } from "@/lib/rsvp/logic";

const OPTIONS: { value: RsvpAnswer; label: string; icon: typeof Check; on: string; off: string }[] = [
  { value: "in", label: "I'm in", icon: Check, on: "bg-emerald-600 text-white border-emerald-600", off: "border-emerald-200 text-emerald-700 hover:bg-emerald-50" },
  { value: "maybe", label: "Maybe", icon: HelpCircle, on: "bg-amber-500 text-white border-amber-500", off: "border-amber-200 text-amber-700 hover:bg-amber-50" },
  { value: "out", label: "Can't make it", icon: X, on: "bg-red-600 text-white border-red-600", off: "border-red-200 text-red-700 hover:bg-red-50" },
];

export default function AnswerButtons({ current, disabled, onAnswer, initialNote = "" }: { current: RsvpAnswer | null; disabled?: boolean; onAnswer: (answer: RsvpAnswer, note: string) => Promise<void>; initialNote?: string }) {
  const [busy, setBusy] = useState<RsvpAnswer | null>(null);
  const [note, setNote] = useState(initialNote);
  const tap = async (a: RsvpAnswer) => {
    if (busy || disabled) return;
    setBusy(a);
    try { await onAnswer(a, a === "in" ? "" : note); } finally { setBusy(null); }
  };
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {OPTIONS.map((o) => {
          const Icon = o.icon;
          const selected = current === o.value;
          return (
            <button key={o.value} type="button" disabled={disabled || !!busy} onClick={() => tap(o.value)} aria-pressed={selected}
              className={`flex flex-col items-center gap-1 rounded-2xl border-2 px-2 py-4 text-sm font-black transition disabled:opacity-60 ${selected ? o.on : `bg-white ${o.off}`}`}>
              <Icon size={22} />{busy === o.value ? "Saving…" : o.label}
            </button>
          );
        })}
      </div>
      {current && current !== "in" && (
        <input value={note} maxLength={200} disabled={disabled} onChange={(e) => setNote(e.target.value)} onBlur={() => note !== initialNote && tap(current)}
          placeholder={current === "out" ? "Reason (optional), e.g. away, injured" : "Anything the coach should know (optional)"}
          className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-teal-400" />
      )}
    </div>
  );
}
