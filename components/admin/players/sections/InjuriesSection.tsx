// components/admin/players/sections/InjuriesSection.tsx
// Injury history tab — add, view and remove hockey injury records stored in medical.injuryHistory

"use client";

import { useState } from "react";
import { BaseSectionProps, InjuryRecord } from "@/types/player.types";
import {
  Zap,
  Plus,
  Trash2,
  Calendar,
  ClipboardList,
  Stethoscope,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

// ── Constants ─────────────────────────────────────────────────────────────────
const INJURY_TYPES: { value: string; label: string; colour: string }[] = [
  { value: "concussion",  label: "Concussion",      colour: "bg-red-100 text-red-700 border-red-200" },
  { value: "fracture",    label: "Fracture",         colour: "bg-orange-100 text-orange-700 border-orange-200" },
  { value: "sprain",      label: "Sprain / Strain",  colour: "bg-amber-100 text-amber-700 border-amber-200" },
  { value: "ligament",    label: "Ligament",         colour: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  { value: "muscle",      label: "Muscle",           colour: "bg-lime-100 text-lime-700 border-lime-200" },
  { value: "joint",       label: "Joint",            colour: "bg-blue-100 text-blue-700 border-blue-200" },
  { value: "cut",         label: "Cut / Laceration", colour: "bg-pink-100 text-pink-700 border-pink-200" },
  { value: "bruise",      label: "Bruise / Contusion",colour: "bg-purple-100 text-purple-700 border-purple-200" },
  { value: "other",       label: "Other",            colour: "bg-slate-100 text-slate-600 border-slate-200" },
];

const EMPTY_FORM: Omit<InjuryRecord, "id"> = {
  date: "",
  type: "",
  description: "",
  treatment: "",
  recoveryPeriod: "",
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso + "T00:00:00").toLocaleDateString("en-AU", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function TypeBadge({ type }: { type: string }) {
  const cfg = INJURY_TYPES.find((t) => t.value === type);
  const colour = cfg?.colour ?? "bg-slate-100 text-slate-600 border-slate-200";
  const label = cfg?.label ?? type;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${colour}`}>
      {label}
    </span>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function InjuriesSection({ formData, onChange }: BaseSectionProps) {
  const injuries: InjuryRecord[] = formData.medical?.injuryHistory ?? [];

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Omit<InjuryRecord, "id">>({ ...EMPTY_FORM });
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [formError, setFormError] = useState("");

  // ── Helpers ─────────────────────────────────────────────────────────────────
  function updateMedical(newInjuries: InjuryRecord[]) {
    onChange("medical", { ...formData.medical, injuryHistory: newInjuries });
  }

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  // ── Add injury ───────────────────────────────────────────────────────────────
  function handleAdd() {
    if (!form.date) { setFormError("Date is required."); return; }
    if (!form.type) { setFormError("Injury type is required."); return; }
    if (!form.description.trim()) { setFormError("Description is required."); return; }

    const newRecord: InjuryRecord = {
      id: `inj-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      ...form,
    };
    updateMedical([newRecord, ...injuries]);
    setForm({ ...EMPTY_FORM });
    setShowForm(false);
    setFormError("");
  }

  // ── Delete injury ────────────────────────────────────────────────────────────
  function handleDelete(id: string) {
    updateMedical(injuries.filter((r) => r.id !== id));
  }

  // ── Derived stats ────────────────────────────────────────────────────────────
  const sorted = [...injuries].sort((a, b) => b.date.localeCompare(a.date));
  const mostRecent = sorted[0];
  const concussions = injuries.filter((i) => i.type === "concussion").length;

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Summary row */}
      {injuries.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[#06054e]/5 rounded-2xl p-4 text-center">
            <p className="text-3xl font-black text-[#06054e]">{injuries.length}</p>
            <p className="text-[10px] font-black uppercase text-slate-500 mt-1">Total Injuries</p>
          </div>
          <div className={`rounded-2xl p-4 text-center ${concussions > 0 ? "bg-red-50" : "bg-slate-50"}`}>
            <p className={`text-3xl font-black ${concussions > 0 ? "text-red-600" : "text-slate-400"}`}>
              {concussions}
            </p>
            <p className="text-[10px] font-black uppercase text-slate-500 mt-1">Concussions</p>
          </div>
          <div className="bg-slate-50 rounded-2xl p-4 text-center">
            <p className="text-sm font-black text-slate-700">{formatDate(mostRecent?.date)}</p>
            <p className="text-[10px] font-black uppercase text-slate-500 mt-1">Most Recent</p>
          </div>
        </div>
      )}

      {/* Concussion warning */}
      {concussions >= 2 && (
        <div className="flex items-start gap-3 bg-red-50 border-2 border-red-200 rounded-2xl px-4 py-3">
          <AlertCircle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-black text-red-800 text-sm uppercase">Multiple concussions recorded</p>
            <p className="text-red-700 text-xs font-bold mt-0.5">
              {concussions} concussions on file. Ensure medical clearance is current before selecting for representative play.
            </p>
          </div>
        </div>
      )}

      {/* Add button */}
      {!showForm && (
        <button
          onClick={() => { setShowForm(true); setFormError(""); }}
          className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-slate-300 text-slate-500 hover:text-[#06054e] hover:border-[#06054e]/40 rounded-2xl text-sm font-black uppercase transition-colors"
        >
          <Plus size={16} />
          Record Injury
        </button>
      )}

      {/* Add form */}
      {showForm && (
        <div className="border-2 border-[#06054e]/20 rounded-2xl p-5 bg-[#06054e]/5 space-y-4">
          <p className="text-xs font-black uppercase text-[#06054e] tracking-widest">New Injury Record</p>

          {formError && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-3 py-2 text-xs font-semibold">
              <AlertCircle size={13} />
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Date */}
            <div>
              <label className="block text-xs font-black uppercase text-slate-500 mb-1">
                Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl text-sm focus:border-[#06054e] focus:outline-none bg-white"
              />
            </div>

            {/* Type */}
            <div>
              <label className="block text-xs font-black uppercase text-slate-500 mb-1">
                Injury Type <span className="text-red-500">*</span>
              </label>
              <select
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:border-[#06054e] focus:outline-none bg-white"
              >
                <option value="">Select type…</option>
                {INJURY_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-black uppercase text-slate-500 mb-1">
                Description <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="e.g. Right knee ligament tear during semi-final"
                className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl text-sm focus:border-[#06054e] focus:outline-none bg-white"
              />
            </div>

            {/* Treatment */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-black uppercase text-slate-500 mb-1">Treatment</label>
              <input
                type="text"
                value={form.treatment}
                onChange={(e) => setForm((f) => ({ ...f, treatment: e.target.value }))}
                placeholder="e.g. Physiotherapy, RICE, surgical repair"
                className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl text-sm focus:border-[#06054e] focus:outline-none bg-white"
              />
            </div>

            {/* Recovery period */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-black uppercase text-slate-500 mb-1">Recovery Period</label>
              <input
                type="text"
                value={form.recoveryPeriod}
                onChange={(e) => setForm((f) => ({ ...f, recoveryPeriod: e.target.value }))}
                placeholder="e.g. 6–8 weeks, Season-ending, Returned to play 14 Apr 2025"
                className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl text-sm focus:border-[#06054e] focus:outline-none bg-white"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button
              onClick={() => { setShowForm(false); setForm({ ...EMPTY_FORM }); setFormError(""); }}
              className="flex-1 py-2.5 border-2 border-slate-200 text-slate-500 font-black uppercase text-xs rounded-2xl hover:bg-slate-50 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              className="flex-[2] flex items-center justify-center gap-2 py-2.5 bg-[#06054e] hover:bg-[#0a0870] text-white font-black uppercase text-sm rounded-2xl transition-all"
            >
              <Zap size={15} />
              Save Injury
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {injuries.length === 0 && !showForm && (
        <div className="text-center py-16 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
          <Zap size={40} className="mx-auto text-slate-200 mb-4" />
          <p className="font-black text-slate-400 uppercase text-sm">No injury records</p>
          <p className="text-slate-400 text-xs mt-2 max-w-xs mx-auto">
            Use the button above to record any hockey-related injuries for this player.
          </p>
        </div>
      )}

      {/* Injury list */}
      {sorted.length > 0 && (
        <div className="space-y-3">
          {sorted.map((injury) => {
            const isExpanded = expanded.has(injury.id);
            return (
              <div
                key={injury.id}
                className={`rounded-2xl border-2 transition-all ${
                  injury.type === "concussion"
                    ? "border-red-200 bg-red-50/40"
                    : "border-slate-100 bg-white hover:border-slate-200"
                }`}
              >
                {/* Header row */}
                <div className="flex items-start gap-3 p-4">
                  {/* Icon */}
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    injury.type === "concussion" ? "bg-red-100" : "bg-[#06054e]/10"
                  }`}>
                    <Zap size={16} className={injury.type === "concussion" ? "text-red-600" : "text-[#06054e]"} />
                  </div>

                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <TypeBadge type={injury.type} />
                      <span className="flex items-center gap-1 text-xs text-slate-400 font-bold">
                        <Calendar size={11} />
                        {formatDate(injury.date)}
                      </span>
                    </div>
                    <p className="font-black text-[#06054e] text-sm leading-tight">{injury.description}</p>

                    {/* Recovery preview — always visible */}
                    {injury.recoveryPeriod && (
                      <p className="flex items-center gap-1.5 text-xs text-slate-500 font-bold mt-1">
                        <Clock size={11} className="text-slate-400" />
                        {injury.recoveryPeriod}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {(injury.treatment) && (
                      <button
                        onClick={() => toggleExpand(injury.id)}
                        className="p-1.5 text-slate-400 hover:text-[#06054e] transition-colors rounded-lg"
                        title={isExpanded ? "Collapse" : "Show treatment"}
                      >
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(injury.id)}
                      className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Remove record"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Expanded: treatment detail */}
                {isExpanded && injury.treatment && (
                  <div className="px-4 pb-4 pt-0 border-t border-slate-100 mt-0">
                    <div className="flex items-start gap-2 pt-3">
                      <Stethoscope size={13} className="text-slate-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[10px] font-black uppercase text-slate-400 mb-0.5">Treatment</p>
                        <p className="text-xs text-slate-600 font-semibold">{injury.treatment}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
