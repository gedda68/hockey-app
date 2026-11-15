// components/member/MedicalConditionsCard.tsx
// Conditions and allergies with their prescribed medication(s). Each row is saved on its own
// (add / edit / delete) through /api/member/my-profile/medical-items — no need to use the main Save button.

"use client";

import { useState } from "react";
import { toast } from "sonner";
import { HeartPulse, Plus, Pencil, Trash2, Loader2, Lock } from "lucide-react";
import { type MedicalItem } from "@/lib/members/medicalItems";

const labelCls = "block text-xs font-black uppercase tracking-wide text-slate-400 mb-1";
const inputCls = "w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-teal-400 disabled:bg-amber-50";
const btn = "inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-black";

const blank = (kind: MedicalItem["kind"] = "condition"): MedicalItem => ({ id: "", kind, name: "", medications: [{ name: "", dose: "" }] });

export default function MedicalConditionsCard({ items, locked, onChanged }: { items: MedicalItem[]; locked?: boolean; onChanged: (items: MedicalItem[]) => void }) {
  const [draft, setDraft] = useState<MedicalItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const save = async () => {
    if (!draft) return;
    if (!draft.name.trim()) { toast.error("Enter the condition or allergy name"); return; }
    setSaving(true);
    try {
      const r = await fetch("/api/member/my-profile/medical-items", {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ item: draft }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "Failed to save");
      onChanged(d.items);
      setDraft(null);
      toast.success("Saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    setSaving(true);
    try {
      const r = await fetch(`/api/member/my-profile/medical-items?id=${encodeURIComponent(id)}`, { method: "DELETE", credentials: "include" });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "Failed to delete");
      onChanged(d.items);
      setConfirmId(null);
      toast.success("Deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete");
    } finally {
      setSaving(false);
    }
  };

  const setMed = (k: number, patch: Partial<{ name: string; dose: string }>) =>
    setDraft((d) => d && { ...d, medications: d.medications.map((m, n) => (n === k ? { ...m, ...patch } : m)) });

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
        <div className="flex items-center gap-2">
          <HeartPulse className="h-4 w-4 text-teal-600" />
          <h2 className="text-sm font-black uppercase tracking-wide text-slate-700">Medical conditions &amp; allergies</h2>
          {locked && <span className="inline-flex items-center gap-0.5 text-[10px] font-bold uppercase text-amber-700 bg-amber-100 border border-amber-300 rounded-full px-1.5 py-0.5"><Lock className="h-2.5 w-2.5" /> Locked</span>}
        </div>
        <p className="text-[11px] font-medium text-slate-400 mt-0.5">Each condition or allergy with the medication(s) prescribed for it. Rows save on their own. Private to you until you&apos;re accepted into a team.</p>
      </div>

      <div className="p-5 space-y-4">
        {items.length === 0 && !draft && <p className="text-sm text-slate-400">Nothing recorded yet.</p>}

        {items.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left">
                  <th className={`${labelCls} py-2 pr-4`}>Condition / Allergy</th>
                  <th className={`${labelCls} py-2 pr-4`}>Medication</th>
                  <th className={`${labelCls} py-2 text-right`}>Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.id} className="border-t border-slate-100 align-top">
                    <td className="py-3 pr-4 font-bold text-slate-800">
                      {it.name} <span className="ml-1 text-[10px] font-black uppercase text-slate-400">{it.kind}</span>
                    </td>
                    <td className="py-3 pr-4 text-slate-700">
                      {it.medications.length === 0 ? <span className="text-slate-300">—</span> : (
                        <ul className="space-y-0.5">
                          {it.medications.map((m, k) => <li key={k} className="font-semibold">{m.name}{m.dose && <span className="font-medium text-slate-400"> · {m.dose}</span>}</li>)}
                        </ul>
                      )}
                    </td>
                    <td className="py-3 text-right whitespace-nowrap">
                      {!locked && (confirmId === it.id ? (
                        <span className="inline-flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-500">Delete?</span>
                          <button type="button" disabled={saving} onClick={() => remove(it.id)} className={`${btn} bg-red-600 text-white hover:bg-red-700`}>Yes</button>
                          <button type="button" onClick={() => setConfirmId(null)} className={`${btn} border-2 border-slate-200 text-slate-600`}>No</button>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-2">
                          <button type="button" onClick={() => setDraft({ ...it, medications: it.medications.length ? it.medications.map((m) => ({ ...m })) : [{ name: "", dose: "" }] })} className={`${btn} border-2 border-slate-200 text-slate-700 hover:bg-slate-50`}><Pencil className="h-3 w-3" /> Edit</button>
                          <button type="button" onClick={() => setConfirmId(it.id)} className={`${btn} border-2 border-slate-200 text-red-600 hover:bg-red-50`}><Trash2 className="h-3 w-3" /> Delete</button>
                        </span>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {draft && (
          <div className="rounded-xl border-2 border-teal-200 bg-teal-50/30 p-4 space-y-3">
            <p className="text-xs font-black uppercase tracking-wide text-teal-700">{draft.id ? "Edit entry" : "New entry"}</p>
            <div className="grid grid-cols-1 sm:grid-cols-[10rem_1fr] gap-3">
              <div>
                <label className={labelCls}>Type</label>
                <select className={inputCls} value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value as MedicalItem["kind"] })}>
                  <option value="condition">Condition</option>
                  <option value="allergy">Allergy</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>{draft.kind === "allergy" ? "Allergy" : "Condition"}</label>
                <input className={inputCls} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  placeholder={draft.kind === "allergy" ? "e.g. Peanut allergy" : "e.g. Type 1 diabetes, Heart"} />
              </div>
            </div>
            <div className="pl-3 border-l-4 border-teal-200 space-y-2">
              <p className={labelCls}>Prescribed medication(s) — add as many as needed</p>
              {draft.medications.map((m, k) => (
                <div key={k} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2">
                  <input className={inputCls} value={m.name} placeholder="Medication" onChange={(e) => setMed(k, { name: e.target.value })} />
                  <input className={inputCls} value={m.dose} placeholder="Dose / how often (optional)" onChange={(e) => setMed(k, { dose: e.target.value })} />
                  <button type="button" aria-label="Remove medication" onClick={() => setDraft({ ...draft, medications: draft.medications.filter((_, n) => n !== k) })}
                    className="rounded-xl border-2 border-slate-200 px-3 text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
              <button type="button" onClick={() => setDraft({ ...draft, medications: [...draft.medications, { name: "", dose: "" }] })} className="inline-flex items-center gap-1 text-xs font-bold text-teal-700 hover:underline">
                <Plus className="h-3.5 w-3.5" /> Add another medication
              </button>
            </div>
            <div className="flex gap-2">
              <button type="button" disabled={saving} onClick={save} className={`${btn} bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-60`}>
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Save
              </button>
              <button type="button" disabled={saving} onClick={() => setDraft(null)} className={`${btn} border-2 border-slate-200 text-slate-600`}>Cancel</button>
            </div>
          </div>
        )}

        {!draft && !locked && (
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setDraft(blank("condition"))} className={`${btn} border-2 border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100`}><Plus className="h-3.5 w-3.5" /> Add condition</button>
            <button type="button" onClick={() => setDraft(blank("allergy"))} className={`${btn} border-2 border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100`}><Plus className="h-3.5 w-3.5" /> Add allergy</button>
          </div>
        )}
      </div>
    </div>
  );
}
