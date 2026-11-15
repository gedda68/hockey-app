// components/member/MedicalItemsEditor.tsx
// Conditions and allergies, each with its own prescribed medication(s).

"use client";

import { Plus, Trash2 } from "lucide-react";
import type { MedicalItem } from "@/lib/members/medicalItems";

const labelCls = "block text-xs font-black uppercase tracking-wide text-slate-400 mb-1";
const inputCls = "w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-teal-400 disabled:bg-amber-50";

export default function MedicalItemsEditor({ value, onChange, disabled }: { value: MedicalItem[]; onChange: (v: MedicalItem[]) => void; disabled?: boolean }) {
  const set = (i: number, patch: Partial<MedicalItem>) => onChange(value.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  const add = (kind: MedicalItem["kind"]) => onChange([...value, { id: "", kind, name: "", medications: [] }]);

  return (
    <div className="sm:col-span-2 space-y-3">
      {value.length === 0 && <p className="text-sm text-slate-400">No conditions or allergies recorded.</p>}

      {value.map((it, i) => (
        <div key={it.id || i} className="rounded-xl border border-slate-200 p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-[10rem_1fr] gap-3">
            <div>
              <label className={labelCls}>Type</label>
              <select className={inputCls} value={it.kind} disabled={disabled} onChange={(e) => set(i, { kind: e.target.value as MedicalItem["kind"] })}>
                <option value="condition">Condition</option>
                <option value="allergy">Allergy</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>{it.kind === "allergy" ? "Allergy" : "Condition"}</label>
              <input className={inputCls} value={it.name} disabled={disabled} onChange={(e) => set(i, { name: e.target.value })}
                placeholder={it.kind === "allergy" ? "e.g. Peanuts, penicillin" : "e.g. Asthma, diabetes"} />
            </div>
          </div>

          <div className="pl-3 border-l-4 border-teal-100 space-y-2">
            <p className={labelCls}>Prescribed medication{it.medications.length === 1 ? "" : "s"} for this {it.kind}</p>
            {it.medications.map((m, k) => (
              <div key={k} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2">
                <input className={inputCls} value={m.name} disabled={disabled} placeholder="Medication"
                  onChange={(e) => set(i, { medications: it.medications.map((x, n) => (n === k ? { ...x, name: e.target.value } : x)) })} />
                <input className={inputCls} value={m.dose} disabled={disabled} placeholder="Dose / how often (optional)"
                  onChange={(e) => set(i, { medications: it.medications.map((x, n) => (n === k ? { ...x, dose: e.target.value } : x)) })} />
                {!disabled && (
                  <button type="button" aria-label="Remove medication" onClick={() => set(i, { medications: it.medications.filter((_, n) => n !== k) })}
                    className="rounded-xl border-2 border-slate-200 px-3 text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
                )}
              </div>
            ))}
            {!disabled && (
              <button type="button" onClick={() => set(i, { medications: [...it.medications, { name: "", dose: "" }] })}
                className="inline-flex items-center gap-1 text-xs font-bold text-teal-700 hover:underline">
                <Plus className="h-3.5 w-3.5" /> Add medication
              </button>
            )}
          </div>

          {!disabled && (
            <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} className="inline-flex items-center gap-1 text-xs font-bold text-red-600 hover:underline">
              <Trash2 className="h-3.5 w-3.5" /> Remove this {it.kind}
            </button>
          )}
        </div>
      ))}

      {!disabled && (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => add("condition")} className="inline-flex items-center gap-1 rounded-xl border-2 border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-black text-teal-700 hover:bg-teal-100"><Plus className="h-3.5 w-3.5" /> Add condition</button>
          <button type="button" onClick={() => add("allergy")} className="inline-flex items-center gap-1 rounded-xl border-2 border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-black text-teal-700 hover:bg-teal-100"><Plus className="h-3.5 w-3.5" /> Add allergy</button>
        </div>
      )}
    </div>
  );
}
