// sections/DisciplinarySection.tsx
// Disciplinary records (cards, suspensions, warnings) for a player

"use client";

import { useState } from "react";
import { BaseSectionProps, DisciplinaryRecord } from "@/types/player.types";
import {
  AlertTriangle,
  Plus,
  Trash2,
  X,
  CheckCircle,
  Calendar,
  Shield,
} from "lucide-react";

type RecordType = DisciplinaryRecord["type"];

const RECORD_TYPES: { value: RecordType; label: string }[] = [
  { value: "yellow_card",  label: "Yellow Card" },
  { value: "red_card",     label: "Red Card" },
  { value: "suspension",   label: "Suspension" },
  { value: "warning",      label: "Warning" },
  { value: "other",        label: "Other" },
];

function typeBadgeClasses(type: RecordType): string {
  switch (type) {
    case "yellow_card":  return "bg-yellow-100 text-yellow-800 border-yellow-300";
    case "red_card":     return "bg-red-100 text-red-700 border-red-300";
    case "suspension":   return "bg-orange-100 text-orange-700 border-orange-300";
    case "warning":      return "bg-blue-100 text-blue-700 border-blue-300";
    default:             return "bg-slate-100 text-slate-600 border-slate-300";
  }
}

function typeLabel(type: RecordType): string {
  return RECORD_TYPES.find((t) => t.value === type)?.label ?? type;
}

function formatDate(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso + "T00:00:00").toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const EMPTY_FORM = {
  date: new Date().toISOString().split("T")[0],
  type: "yellow_card" as RecordType,
  competition: "",
  reason: "",
  duration: "",
  endDate: "",
  isActive: true,
  imposedBy: "",
  notes: "",
};

export default function DisciplinarySection({
  formData,
  onChange,
}: BaseSectionProps) {
  const records: DisciplinaryRecord[] = formData.disciplinaryHistory ?? [];
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");

  function handleAddRecord() {
    setFormError("");
    if (!form.date) {
      setFormError("Date is required.");
      return;
    }
    if (!form.reason.trim()) {
      setFormError("Reason is required.");
      return;
    }

    const newRecord: DisciplinaryRecord = {
      id: `disc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      ...form,
    };

    onChange("disciplinaryHistory", [...records, newRecord]);
    setForm(EMPTY_FORM);
    setShowForm(false);
  }

  function handleDelete(id: string) {
    onChange(
      "disciplinaryHistory",
      records.filter((r) => r.id !== id),
    );
  }

  return (
    <div className="space-y-6">
      {/* Header row with Add button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-black text-[#06054e] text-sm uppercase tracking-wide">
            Disciplinary Records
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Cards, suspensions and warnings
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => {
              setShowForm(true);
              setFormError("");
              setForm(EMPTY_FORM);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-[#06054e] hover:bg-[#0a0870] text-white text-xs font-black uppercase rounded-xl transition-all"
          >
            <Plus size={14} />
            Add Record
          </button>
        )}
      </div>

      {/* Inline add form */}
      {showForm && (
        <div className="bg-slate-50 border-2 border-[#06054e]/20 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between mb-1">
            <p className="font-black text-[#06054e] text-sm uppercase">
              New Disciplinary Record
            </p>
            <button
              onClick={() => setShowForm(false)}
              className="p-1 rounded-full hover:bg-slate-200 text-slate-400 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {formError && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-3 py-2 text-xs font-semibold">
              <AlertTriangle size={13} />
              {formError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {/* Date */}
            <div>
              <label className="block text-xs font-black uppercase text-slate-500 mb-1">
                Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full px-3 py-2 border-2 border-slate-200 rounded-xl text-sm focus:border-[#06054e] focus:outline-none"
              />
            </div>

            {/* Type */}
            <div>
              <label className="block text-xs font-black uppercase text-slate-500 mb-1">
                Type
              </label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as RecordType })}
                className="w-full px-3 py-2 border-2 border-slate-200 rounded-xl text-sm font-bold text-[#06054e] focus:border-[#06054e] focus:outline-none"
              >
                {RECORD_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Competition */}
            <div>
              <label className="block text-xs font-black uppercase text-slate-500 mb-1">
                Competition
              </label>
              <input
                type="text"
                value={form.competition}
                onChange={(e) => setForm({ ...form, competition: e.target.value })}
                placeholder="e.g. Under 16 State Championships"
                className="w-full px-3 py-2 border-2 border-slate-200 rounded-xl text-sm focus:border-[#06054e] focus:outline-none"
              />
            </div>

            {/* Imposed By */}
            <div>
              <label className="block text-xs font-black uppercase text-slate-500 mb-1">
                Imposed By
              </label>
              <input
                type="text"
                value={form.imposedBy}
                onChange={(e) => setForm({ ...form, imposedBy: e.target.value })}
                placeholder="e.g. Match official, Association"
                className="w-full px-3 py-2 border-2 border-slate-200 rounded-xl text-sm focus:border-[#06054e] focus:outline-none"
              />
            </div>

            {/* Duration */}
            <div>
              <label className="block text-xs font-black uppercase text-slate-500 mb-1">
                Duration
              </label>
              <input
                type="text"
                value={form.duration}
                onChange={(e) => setForm({ ...form, duration: e.target.value })}
                placeholder="e.g. 2 games, 4 weeks"
                className="w-full px-3 py-2 border-2 border-slate-200 rounded-xl text-sm focus:border-[#06054e] focus:outline-none"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="block text-xs font-black uppercase text-slate-500 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                className="w-full px-3 py-2 border-2 border-slate-200 rounded-xl text-sm focus:border-[#06054e] focus:outline-none"
              />
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs font-black uppercase text-slate-500 mb-1">
              Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={2}
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              placeholder="Describe the reason for this record…"
              className="w-full px-3 py-2 border-2 border-slate-200 rounded-xl text-sm focus:border-[#06054e] focus:outline-none resize-none"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-black uppercase text-slate-500 mb-1">
              Notes
            </label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Additional notes…"
              className="w-full px-3 py-2 border-2 border-slate-200 rounded-xl text-sm focus:border-[#06054e] focus:outline-none resize-none"
            />
          </div>

          {/* Active toggle */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setForm({ ...form, isActive: !form.isActive })}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                form.isActive ? "bg-red-500" : "bg-slate-200"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  form.isActive ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
            <span className="text-xs font-black uppercase text-slate-600">
              {form.isActive ? "Active / Ongoing" : "Expired / Served"}
            </span>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setShowForm(false)}
              className="flex-1 py-2.5 border-2 border-slate-200 text-slate-500 font-black uppercase text-xs rounded-xl hover:bg-slate-100 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleAddRecord}
              className="flex-[2] flex items-center justify-center gap-2 py-2.5 bg-[#06054e] hover:bg-[#0a0870] text-white font-black uppercase text-xs rounded-xl transition-all"
            >
              <CheckCircle size={13} />
              Save Record
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {records.length === 0 && !showForm && (
        <div className="text-center py-16 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
          <Shield size={36} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-400 font-black uppercase text-sm">
            No disciplinary records.
          </p>
          <p className="text-slate-400 text-xs mt-1">
            A clean record — no cards or suspensions recorded.
          </p>
        </div>
      )}

      {/* Records */}
      {records.length > 0 && (
        <div className="space-y-3">
          {[...records]
            .sort((a, b) => b.date.localeCompare(a.date))
            .map((record) => (
              <div
                key={record.id}
                className={`bg-white border rounded-2xl p-4 shadow-sm ${
                  record.isActive
                    ? "border-red-100"
                    : "border-slate-100 opacity-80"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${typeBadgeClasses(record.type)}`}
                        >
                          {typeLabel(record.type)}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${
                            record.isActive
                              ? "bg-red-50 text-red-600 border-red-200"
                              : "bg-slate-50 text-slate-400 border-slate-200"
                          }`}
                        >
                          {record.isActive ? "Active" : "Expired"}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-slate-700 leading-tight">
                        {record.reason}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(record.id)}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors flex-shrink-0"
                    title="Delete record"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-50 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <Calendar size={11} className="text-slate-400 flex-shrink-0" />
                    <span><span className="font-semibold">Date:</span> {formatDate(record.date)}</span>
                  </div>
                  {record.competition && (
                    <div className="flex items-center gap-1.5">
                      <Shield size={11} className="text-slate-400 flex-shrink-0" />
                      <span className="truncate">{record.competition}</span>
                    </div>
                  )}
                  {record.duration && (
                    <div className="flex items-center gap-1.5">
                      <Calendar size={11} className="text-slate-400 flex-shrink-0" />
                      <span><span className="font-semibold">Duration:</span> {record.duration}</span>
                    </div>
                  )}
                  {record.endDate && (
                    <div className="flex items-center gap-1.5">
                      <Calendar size={11} className="text-slate-400 flex-shrink-0" />
                      <span><span className="font-semibold">End:</span> {formatDate(record.endDate)}</span>
                    </div>
                  )}
                  {record.imposedBy && (
                    <div className="flex items-center gap-1.5 col-span-2">
                      <span><span className="font-semibold">Imposed by:</span> {record.imposedBy}</span>
                    </div>
                  )}
                  {record.notes && (
                    <div className="col-span-2 text-slate-400 italic">
                      {record.notes}
                    </div>
                  )}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
