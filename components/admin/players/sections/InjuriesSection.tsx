// components/admin/players/sections/InjuriesSection.tsx
// Injury history tab — add, view and remove hockey injury records stored in medical.injuryHistory
// Each injury can have clearance documents, imaging, specialist reports and other evidence attached.

"use client";

import { useState } from "react";
import { BaseSectionProps, InjuryRecord, InjuryDocument } from "@/types/player.types";
import { getErrorMessage } from "@/lib/utils/errors";
import {
  Zap,
  Plus,
  Trash2,
  Calendar,
  Stethoscope,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  FileText,
  Upload,
  Eye,
  RefreshCw,
  Loader2,
  ShieldCheck,
  ShieldAlert,
  FileBadge,
} from "lucide-react";

// ── Constants ─────────────────────────────────────────────────────────────────

const INJURY_TYPES: { value: string; label: string; colour: string }[] = [
  { value: "concussion",  label: "Concussion",        colour: "bg-red-100 text-red-700 border-red-200" },
  { value: "fracture",    label: "Fracture",           colour: "bg-orange-100 text-orange-700 border-orange-200" },
  { value: "sprain",      label: "Sprain / Strain",   colour: "bg-amber-100 text-amber-700 border-amber-200" },
  { value: "ligament",    label: "Ligament",           colour: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  { value: "muscle",      label: "Muscle",             colour: "bg-lime-100 text-lime-700 border-lime-200" },
  { value: "joint",       label: "Joint",              colour: "bg-blue-100 text-blue-700 border-blue-200" },
  { value: "cut",         label: "Cut / Laceration",  colour: "bg-pink-100 text-pink-700 border-pink-200" },
  { value: "bruise",      label: "Bruise / Contusion", colour: "bg-purple-100 text-purple-700 border-purple-200" },
  { value: "other",       label: "Other",              colour: "bg-slate-100 text-slate-600 border-slate-200" },
];

const DOC_TYPES: {
  value: InjuryDocument["type"];
  label: string;
  defaultLabel: string;
  colour: string;
  isClearance: boolean;
}[] = [
  {
    value: "medical_clearance",
    label: "Medical Clearance",
    defaultLabel: "Medical Clearance Certificate",
    colour: "bg-green-100 text-green-700 border-green-200",
    isClearance: true,
  },
  {
    value: "return_to_play",
    label: "Return to Play Certificate",
    defaultLabel: "Return to Play Certificate",
    colour: "bg-emerald-100 text-emerald-700 border-emerald-200",
    isClearance: true,
  },
  {
    value: "imaging_scan",
    label: "Imaging / Scan",
    defaultLabel: "Imaging Results (X-ray / MRI / CT)",
    colour: "bg-blue-100 text-blue-700 border-blue-200",
    isClearance: false,
  },
  {
    value: "specialist_report",
    label: "Specialist Report",
    defaultLabel: "Specialist Assessment Report",
    colour: "bg-violet-100 text-violet-700 border-violet-200",
    isClearance: false,
  },
  {
    value: "physio_report",
    label: "Physio Report",
    defaultLabel: "Physiotherapy Report",
    colour: "bg-cyan-100 text-cyan-700 border-cyan-200",
    isClearance: false,
  },
  {
    value: "hospital_report",
    label: "Hospital Report",
    defaultLabel: "Hospital / Emergency Discharge Report",
    colour: "bg-rose-100 text-rose-700 border-rose-200",
    isClearance: false,
  },
  {
    value: "other",
    label: "Other",
    defaultLabel: "Supporting Document",
    colour: "bg-slate-100 text-slate-600 border-slate-200",
    isClearance: false,
  },
];

const EMPTY_INJURY_FORM: Omit<InjuryRecord, "id"> = {
  date: "",
  type: "",
  description: "",
  treatment: "",
  recoveryPeriod: "",
};

const EMPTY_DOC_FORM: Omit<InjuryDocument, "id" | "uploadedAt"> = {
  type: "medical_clearance",
  label: "Medical Clearance Certificate",
  issuedBy: "",
  issuedDate: "",
  expiryDate: "",
  notes: "",
  url: "",
  name: "",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso + "T00:00:00").toLocaleDateString("en-AU", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function formatFileSize(bytes?: number) {
  if (!bytes) return "";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1048576).toFixed(1) + " MB";
}

/** Returns null = no clearance doc, "valid" = cleared, "expired" = lapsed */
function getClearanceStatus(docs: InjuryDocument[]): "valid" | "expired" | null {
  const today = new Date().toISOString().split("T")[0];
  const clearanceDocs = docs.filter(
    (d) => DOC_TYPES.find((t) => t.value === d.type)?.isClearance,
  );
  if (clearanceDocs.length === 0) return null;
  const hasValid = clearanceDocs.some((d) => !d.expiryDate || d.expiryDate >= today);
  return hasValid ? "valid" : "expired";
}

function isExpired(expiryDate?: string): boolean {
  if (!expiryDate) return false;
  return expiryDate < new Date().toISOString().split("T")[0];
}

function isExpiringSoon(expiryDate?: string): boolean {
  if (!expiryDate) return false;
  const today = new Date();
  const expiry = new Date(expiryDate + "T00:00:00");
  const diff = (expiry.getTime() - today.getTime()) / 86400000;
  return diff >= 0 && diff <= 30;
}

// ── Sub-components ────────────────────────────────────────────────────────────

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

function DocTypeBadge({ type }: { type: InjuryDocument["type"] }) {
  const cfg = DOC_TYPES.find((t) => t.value === type);
  const colour = cfg?.colour ?? "bg-slate-100 text-slate-600 border-slate-200";
  const label = cfg?.label ?? type;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${colour}`}>
      {label}
    </span>
  );
}

function ClearanceBadge({ status }: { status: "valid" | "expired" | null }) {
  if (!status) return null;
  if (status === "valid") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-green-100 text-green-700 border border-green-200">
        <ShieldCheck size={10} />
        Cleared
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-red-100 text-red-700 border border-red-200">
      <ShieldAlert size={10} />
      Clearance Expired
    </span>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function InjuriesSection({ formData, onChange }: BaseSectionProps) {
  const injuries: InjuryRecord[] = formData.medical?.injuryHistory ?? [];

  // Injury add-form state
  const [showInjuryForm, setShowInjuryForm] = useState(false);
  const [injuryForm, setInjuryForm] = useState<Omit<InjuryRecord, "id">>({ ...EMPTY_INJURY_FORM });
  const [injuryFormError, setInjuryFormError] = useState("");

  // Expanded injury cards
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Per-injury doc add-form: injuryId → boolean / form state / error
  const [showDocForm, setShowDocForm] = useState<Record<string, boolean>>({});
  const [docForm, setDocForm] = useState<Record<string, Omit<InjuryDocument, "id" | "uploadedAt">>>({});
  const [docFormError, setDocFormError] = useState<Record<string, string>>({});

  // File upload in-progress: docId → boolean
  const [uploading, setUploading] = useState<Record<string, boolean>>({});

  // ── Medical update helper ──────────────────────────────────────────────────
  function updateMedical(newInjuries: InjuryRecord[]) {
    onChange("medical", { ...formData.medical, injuryHistory: newInjuries });
  }

  function updateInjury(injuryId: string, updates: Partial<InjuryRecord>) {
    updateMedical(injuries.map((i) => (i.id === injuryId ? { ...i, ...updates } : i)));
  }

  // ── Expand toggle ──────────────────────────────────────────────────────────
  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  // ── Add injury ─────────────────────────────────────────────────────────────
  function handleAddInjury() {
    if (!injuryForm.date)               { setInjuryFormError("Date is required."); return; }
    if (!injuryForm.type)               { setInjuryFormError("Injury type is required."); return; }
    if (!injuryForm.description.trim()) { setInjuryFormError("Description is required."); return; }

    const newRecord: InjuryRecord = {
      id: `inj-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      ...injuryForm,
      documents: [],
    };
    updateMedical([newRecord, ...injuries]);
    setInjuryForm({ ...EMPTY_INJURY_FORM });
    setShowInjuryForm(false);
    setInjuryFormError("");
  }

  // ── Delete injury ──────────────────────────────────────────────────────────
  function handleDeleteInjury(id: string) {
    updateMedical(injuries.filter((r) => r.id !== id));
  }

  // ── Document form helpers ──────────────────────────────────────────────────
  function openDocForm(injuryId: string) {
    setShowDocForm((prev) => ({ ...prev, [injuryId]: true }));
    setDocForm((prev) => ({ ...prev, [injuryId]: { ...EMPTY_DOC_FORM } }));
    setDocFormError((prev) => ({ ...prev, [injuryId]: "" }));
    // Auto-expand the card
    setExpanded((prev) => new Set([...prev, injuryId]));
  }

  function closeDocForm(injuryId: string) {
    setShowDocForm((prev) => ({ ...prev, [injuryId]: false }));
    setDocFormError((prev) => ({ ...prev, [injuryId]: "" }));
  }

  function handleDocTypeChange(injuryId: string, type: InjuryDocument["type"]) {
    const cfg = DOC_TYPES.find((t) => t.value === type);
    setDocForm((prev) => ({
      ...prev,
      [injuryId]: {
        ...prev[injuryId],
        type,
        label: cfg?.defaultLabel ?? prev[injuryId]?.label ?? "",
      },
    }));
  }

  function handleAddDocument(injuryId: string) {
    const form = docForm[injuryId];
    if (!form) return;
    if (!form.label.trim()) {
      setDocFormError((p) => ({ ...p, [injuryId]: "A title / label is required." }));
      return;
    }

    const newDoc: InjuryDocument = {
      id: `idoc-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      uploadedAt: new Date().toISOString(),
      ...form,
    };

    const injury = injuries.find((i) => i.id === injuryId);
    if (!injury) return;
    updateInjury(injuryId, { documents: [...(injury.documents ?? []), newDoc] });
    closeDocForm(injuryId);
  }

  function handleDeleteDocument(injuryId: string, docId: string) {
    const injury = injuries.find((i) => i.id === injuryId);
    if (!injury) return;
    updateInjury(injuryId, {
      documents: (injury.documents ?? []).filter((d) => d.id !== docId),
    });
  }

  // ── File upload ────────────────────────────────────────────────────────────
  async function handleFileUpload(injuryId: string, docId: string, file: File) {
    setUploading((prev) => ({ ...prev, [docId]: true }));
    try {
      // Replace URL.createObjectURL with real S3/server upload in production
      await new Promise((r) => setTimeout(r, 600));
      const fileUrl = URL.createObjectURL(file);

      const injury = injuries.find((i) => i.id === injuryId);
      if (!injury) return;
      updateInjury(injuryId, {
        documents: (injury.documents ?? []).map((d) =>
          d.id === docId
            ? { ...d, url: fileUrl, name: file.name, size: file.size, uploadedAt: new Date().toISOString() }
            : d,
        ),
      });
    } catch (err) {
      alert(`Upload failed: ${getErrorMessage(err)}`);
    } finally {
      setUploading((prev) => ({ ...prev, [docId]: false }));
    }
  }

  function triggerFileInput(injuryId: string, docId: string) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*,.pdf,.doc,.docx";
    input.onchange = (e: any) => {
      const file = e.target?.files?.[0];
      if (file) handleFileUpload(injuryId, docId, file);
    };
    input.click();
  }

  // ── Derived ────────────────────────────────────────────────────────────────
  const sorted = [...injuries].sort((a, b) => b.date.localeCompare(a.date));
  const mostRecent = sorted[0];
  const concussions = injuries.filter((i) => i.type === "concussion").length;

  // ── Render ─────────────────────────────────────────────────────────────────
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

      {/* Add injury button */}
      {!showInjuryForm && (
        <button
          onClick={() => { setShowInjuryForm(true); setInjuryFormError(""); }}
          className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-slate-300 text-slate-500 hover:text-[#06054e] hover:border-[#06054e]/40 rounded-2xl text-sm font-black uppercase transition-colors"
        >
          <Plus size={16} />
          Record Injury
        </button>
      )}

      {/* Add injury form */}
      {showInjuryForm && (
        <div className="border-2 border-[#06054e]/20 rounded-2xl p-5 bg-[#06054e]/5 space-y-4">
          <p className="text-xs font-black uppercase text-[#06054e] tracking-widest">New Injury Record</p>

          {injuryFormError && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-3 py-2 text-xs font-semibold">
              <AlertCircle size={13} />
              {injuryFormError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black uppercase text-slate-500 mb-1">
                Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={injuryForm.date}
                onChange={(e) => setInjuryForm((f) => ({ ...f, date: e.target.value }))}
                className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl text-sm focus:border-[#06054e] focus:outline-none bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase text-slate-500 mb-1">
                Injury Type <span className="text-red-500">*</span>
              </label>
              <select
                value={injuryForm.type}
                onChange={(e) => setInjuryForm((f) => ({ ...f, type: e.target.value }))}
                className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:border-[#06054e] focus:outline-none bg-white"
              >
                <option value="">Select type…</option>
                {INJURY_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-black uppercase text-slate-500 mb-1">
                Description <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={injuryForm.description}
                onChange={(e) => setInjuryForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="e.g. Right knee ligament tear during semi-final"
                className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl text-sm focus:border-[#06054e] focus:outline-none bg-white"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-black uppercase text-slate-500 mb-1">Treatment</label>
              <input
                type="text"
                value={injuryForm.treatment}
                onChange={(e) => setInjuryForm((f) => ({ ...f, treatment: e.target.value }))}
                placeholder="e.g. Physiotherapy, RICE, surgical repair"
                className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl text-sm focus:border-[#06054e] focus:outline-none bg-white"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-black uppercase text-slate-500 mb-1">Recovery Period</label>
              <input
                type="text"
                value={injuryForm.recoveryPeriod}
                onChange={(e) => setInjuryForm((f) => ({ ...f, recoveryPeriod: e.target.value }))}
                placeholder="e.g. 6–8 weeks, Season-ending, Returned to play 14 Apr 2025"
                className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl text-sm focus:border-[#06054e] focus:outline-none bg-white"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button
              onClick={() => { setShowInjuryForm(false); setInjuryForm({ ...EMPTY_INJURY_FORM }); setInjuryFormError(""); }}
              className="flex-1 py-2.5 border-2 border-slate-200 text-slate-500 font-black uppercase text-xs rounded-2xl hover:bg-slate-50 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleAddInjury}
              className="flex-[2] flex items-center justify-center gap-2 py-2.5 bg-[#06054e] hover:bg-[#0a0870] text-white font-black uppercase text-sm rounded-2xl transition-all"
            >
              <Zap size={15} />
              Save Injury
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {injuries.length === 0 && !showInjuryForm && (
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
            const docs = injury.documents ?? [];
            const clearance = getClearanceStatus(docs);
            const docCount = docs.length;

            return (
              <div
                key={injury.id}
                className={`rounded-2xl border-2 transition-all ${
                  injury.type === "concussion"
                    ? "border-red-200 bg-red-50/40"
                    : "border-slate-100 bg-white hover:border-slate-200"
                }`}
              >
                {/* ── Card header ─────────────────────────────────────────── */}
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
                      <ClearanceBadge status={clearance} />
                      <span className="flex items-center gap-1 text-xs text-slate-400 font-bold">
                        <Calendar size={11} />
                        {formatDate(injury.date)}
                      </span>
                    </div>

                    <p className="font-black text-[#06054e] text-sm leading-tight">{injury.description}</p>

                    {injury.recoveryPeriod && (
                      <p className="flex items-center gap-1.5 text-xs text-slate-500 font-bold mt-1">
                        <Clock size={11} className="text-slate-400" />
                        {injury.recoveryPeriod}
                      </p>
                    )}

                    {docCount > 0 && (
                      <p className="flex items-center gap-1.5 text-xs text-slate-400 font-bold mt-1">
                        <FileText size={11} />
                        {docCount} document{docCount !== 1 ? "s" : ""} attached
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => openDocForm(injury.id)}
                      className="p-1.5 text-slate-400 hover:text-[#06054e] transition-colors rounded-lg"
                      title="Attach document"
                    >
                      <FileBadge size={14} />
                    </button>
                    <button
                      onClick={() => toggleExpand(injury.id)}
                      className="p-1.5 text-slate-400 hover:text-[#06054e] transition-colors rounded-lg"
                      title={isExpanded ? "Collapse" : "Expand"}
                    >
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                    <button
                      onClick={() => handleDeleteInjury(injury.id)}
                      className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Remove record"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* ── Expanded body ────────────────────────────────────────── */}
                {isExpanded && (
                  <div className="border-t border-slate-100">

                    {/* Treatment */}
                    {injury.treatment && (
                      <div className="px-4 py-3 flex items-start gap-2">
                        <Stethoscope size={13} className="text-slate-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[10px] font-black uppercase text-slate-400 mb-0.5">Treatment</p>
                          <p className="text-xs text-slate-600 font-semibold">{injury.treatment}</p>
                        </div>
                      </div>
                    )}

                    {/* ── Documents ───────────────────────────────────────── */}
                    <div className={`px-4 pb-4 ${injury.treatment ? "border-t border-slate-100 pt-3" : "pt-3"}`}>

                      <div className="flex items-center justify-between mb-3">
                        <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-1.5">
                          <FileBadge size={11} />
                          Clearance &amp; Evidence Documents
                        </p>
                        {!showDocForm[injury.id] && (
                          <button
                            onClick={() => openDocForm(injury.id)}
                            className="flex items-center gap-1 text-[10px] font-black uppercase text-[#06054e] hover:text-[#0a0870] transition-colors"
                          >
                            <Plus size={11} />
                            Add Document
                          </button>
                        )}
                      </div>

                      {/* Document list */}
                      {docs.length > 0 && (
                        <div className="space-y-2 mb-3">
                          {docs.map((doc) => {
                            const expired = isExpired(doc.expiryDate);
                            const expiringSoon = !expired && isExpiringSoon(doc.expiryDate);
                            const isUploading = uploading[doc.id];
                            const hasFile = !!doc.url;

                            return (
                              <div
                                key={doc.id}
                                className={`rounded-xl border-2 p-3 ${
                                  expired
                                    ? "border-red-200 bg-red-50/50"
                                    : expiringSoon
                                    ? "border-amber-200 bg-amber-50/50"
                                    : hasFile
                                    ? "border-green-100 bg-green-50/30"
                                    : "border-slate-100 bg-slate-50/60"
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap mb-1">
                                      <DocTypeBadge type={doc.type} />
                                      {expired && (
                                        <span className="text-[10px] font-black uppercase text-red-600 flex items-center gap-0.5">
                                          <AlertCircle size={9} /> Expired
                                        </span>
                                      )}
                                      {expiringSoon && (
                                        <span className="text-[10px] font-black uppercase text-amber-600 flex items-center gap-0.5">
                                          <AlertCircle size={9} /> Expiring soon
                                        </span>
                                      )}
                                      {hasFile && !expired && (
                                        <CheckCircle size={11} className="text-green-500" />
                                      )}
                                    </div>

                                    <p className="text-xs font-black text-slate-800">{doc.label}</p>

                                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                                      {doc.issuedBy && (
                                        <span className="text-[11px] text-slate-500 font-semibold">
                                          By: {doc.issuedBy}
                                        </span>
                                      )}
                                      {doc.issuedDate && (
                                        <span className="text-[11px] text-slate-500 font-semibold">
                                          Issued: {formatDate(doc.issuedDate)}
                                        </span>
                                      )}
                                      {doc.expiryDate && (
                                        <span className={`text-[11px] font-semibold ${
                                          expired ? "text-red-600" : expiringSoon ? "text-amber-600" : "text-slate-500"
                                        }`}>
                                          Expires: {formatDate(doc.expiryDate)}
                                        </span>
                                      )}
                                      {hasFile && doc.name && (
                                        <span className="text-[11px] text-slate-400 font-semibold">
                                          {doc.name}{doc.size ? ` (${formatFileSize(doc.size)})` : ""}
                                        </span>
                                      )}
                                    </div>

                                    {doc.notes && (
                                      <p className="text-[11px] text-slate-500 mt-1 italic">{doc.notes}</p>
                                    )}
                                  </div>

                                  {/* Doc actions */}
                                  <div className="flex items-center gap-1 flex-shrink-0">
                                    {isUploading ? (
                                      <Loader2 size={14} className="animate-spin text-[#06054e]" />
                                    ) : hasFile ? (
                                      <>
                                        <a
                                          href={doc.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="p-1.5 text-slate-400 hover:text-[#06054e] rounded-lg transition-colors"
                                          title="View file"
                                        >
                                          <Eye size={13} />
                                        </a>
                                        <button
                                          onClick={() => triggerFileInput(injury.id, doc.id)}
                                          className="p-1.5 text-slate-400 hover:text-[#06054e] rounded-lg transition-colors"
                                          title="Replace file"
                                        >
                                          <RefreshCw size={13} />
                                        </button>
                                      </>
                                    ) : (
                                      <button
                                        onClick={() => triggerFileInput(injury.id, doc.id)}
                                        className="p-1.5 text-[#06054e]/70 hover:text-[#06054e] rounded-lg transition-colors"
                                        title="Upload file"
                                      >
                                        <Upload size={13} />
                                      </button>
                                    )}
                                    <button
                                      onClick={() => handleDeleteDocument(injury.id, doc.id)}
                                      className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                      title="Remove document"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                </div>

                                {/* Upload prompt when no file yet */}
                                {!hasFile && !isUploading && (
                                  <button
                                    onClick={() => triggerFileInput(injury.id, doc.id)}
                                    className="mt-2 w-full flex items-center justify-center gap-2 py-2 border border-dashed border-slate-300 rounded-lg text-xs text-slate-400 font-bold hover:border-[#06054e]/40 hover:text-[#06054e]/60 transition-colors"
                                  >
                                    <Upload size={12} />
                                    Click to attach file (PDF, image, Word)
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Empty docs state */}
                      {docs.length === 0 && !showDocForm[injury.id] && (
                        <div className="py-4 text-center border border-dashed border-slate-200 rounded-xl">
                          <FileBadge size={24} className="mx-auto text-slate-200 mb-1" />
                          <p className="text-xs text-slate-400 font-bold">No documents attached</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Add clearance certificates, imaging results or specialist reports
                          </p>
                        </div>
                      )}

                      {/* ── Add document form ─────────────────────────────── */}
                      {showDocForm[injury.id] && (
                        <div className="border-2 border-[#06054e]/15 rounded-xl p-4 bg-white space-y-3 mt-1">
                          <p className="text-[10px] font-black uppercase text-[#06054e] tracking-widest">
                            New Document
                          </p>

                          {docFormError[injury.id] && (
                            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-1.5 text-xs font-semibold">
                              <AlertCircle size={12} />
                              {docFormError[injury.id]}
                            </div>
                          )}

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {/* Doc type */}
                            <div className="sm:col-span-2">
                              <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                                Document Type <span className="text-red-500">*</span>
                              </label>
                              <select
                                value={docForm[injury.id]?.type ?? "medical_clearance"}
                                onChange={(e) =>
                                  handleDocTypeChange(injury.id, e.target.value as InjuryDocument["type"])
                                }
                                className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg text-sm font-bold text-slate-700 focus:border-[#06054e] focus:outline-none bg-white"
                              >
                                {DOC_TYPES.map((t) => (
                                  <option key={t.value} value={t.value}>{t.label}</option>
                                ))}
                              </select>
                            </div>

                            {/* Label */}
                            <div className="sm:col-span-2">
                              <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                                Title / Label <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                value={docForm[injury.id]?.label ?? ""}
                                onChange={(e) =>
                                  setDocForm((p) => ({ ...p, [injury.id]: { ...p[injury.id], label: e.target.value } }))
                                }
                                placeholder="e.g. Return to Play — Dr Smith, 14 Apr 2025"
                                className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg text-sm focus:border-[#06054e] focus:outline-none bg-white"
                              />
                            </div>

                            {/* Issued by */}
                            <div>
                              <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                                Issued By
                              </label>
                              <input
                                type="text"
                                value={docForm[injury.id]?.issuedBy ?? ""}
                                onChange={(e) =>
                                  setDocForm((p) => ({ ...p, [injury.id]: { ...p[injury.id], issuedBy: e.target.value } }))
                                }
                                placeholder="Doctor / clinic / specialist"
                                className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg text-sm focus:border-[#06054e] focus:outline-none bg-white"
                              />
                            </div>

                            {/* Issued date */}
                            <div>
                              <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                                Issued Date
                              </label>
                              <input
                                type="date"
                                value={docForm[injury.id]?.issuedDate ?? ""}
                                onChange={(e) =>
                                  setDocForm((p) => ({ ...p, [injury.id]: { ...p[injury.id], issuedDate: e.target.value } }))
                                }
                                className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg text-sm focus:border-[#06054e] focus:outline-none bg-white"
                              />
                            </div>

                            {/* Expiry date */}
                            <div>
                              <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                                Expiry Date
                                <span className="ml-1 text-slate-400 font-normal normal-case text-[9px]">
                                  (if applicable)
                                </span>
                              </label>
                              <input
                                type="date"
                                value={docForm[injury.id]?.expiryDate ?? ""}
                                onChange={(e) =>
                                  setDocForm((p) => ({ ...p, [injury.id]: { ...p[injury.id], expiryDate: e.target.value } }))
                                }
                                className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg text-sm focus:border-[#06054e] focus:outline-none bg-white"
                              />
                            </div>

                            {/* Notes */}
                            <div>
                              <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                                Notes
                              </label>
                              <input
                                type="text"
                                value={docForm[injury.id]?.notes ?? ""}
                                onChange={(e) =>
                                  setDocForm((p) => ({ ...p, [injury.id]: { ...p[injury.id], notes: e.target.value } }))
                                }
                                placeholder="Any additional context"
                                className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg text-sm focus:border-[#06054e] focus:outline-none bg-white"
                              />
                            </div>
                          </div>

                          <p className="text-[11px] text-slate-400 font-semibold">
                            You can attach a file after saving the document entry.
                          </p>

                          <div className="flex gap-2 pt-1">
                            <button
                              onClick={() => closeDocForm(injury.id)}
                              className="flex-1 py-2 border-2 border-slate-200 text-slate-500 font-black uppercase text-[11px] rounded-xl hover:bg-slate-50 transition-all"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleAddDocument(injury.id)}
                              className="flex-[2] flex items-center justify-center gap-1.5 py-2 bg-[#06054e] hover:bg-[#0a0870] text-white font-black uppercase text-xs rounded-xl transition-all"
                            >
                              <Plus size={13} />
                              Save Document
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                    {/* end documents section */}
                  </div>
                )}
                {/* end expanded body */}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
